import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import GlossModel from "@/models/Gloss";
import { uploadGlossJson } from "@/lib/cloudinary";
import { validateAnimationJson } from "@/lib/animation/rigProfiles";

/**
 * Admin-style endpoint for registering a new sign: upload the exported
 * animation as a .json file plus form fields, rather than an inline body.
 *
 * Expects multipart/form-data:
 *   - gloss: string (e.g. "HELLO")
 *   - synonyms: comma-separated string (e.g. "hi,hey,greetings")
 *   - file: the animation .json file
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  const gloss = form?.get("gloss");
  const synonymsRaw = form?.get("synonyms");
  const file = form?.get("file");

  if (typeof gloss !== "string" || !gloss.trim()) {
    return NextResponse.json({ error: "Missing 'gloss' field" }, { status: 400 });
  }
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "Missing 'file' (animation JSON)" }, { status: 400 });
  }

  let jsonData: unknown;
  try {
    jsonData = JSON.parse(await file.text());
  } catch {
    return NextResponse.json({ error: "'file' is not valid JSON" }, { status: 400 });
  }

  const sourceAvatarRaw = form?.get("sourceAvatar");
  const sourceAvatar =
    sourceAvatarRaw === "girl" || sourceAvatarRaw === "boy" ? sourceAvatarRaw : undefined;

  const synonyms =
    typeof synonymsRaw === "string"
      ? synonymsRaw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

  // Accepts Mixamo *or* 3ds Max Biped skeletons — the QuickMagic avatar is
  // Biped, so a Mixamo-only check refused every clip authored against it.
  const validation = validateAnimationJson(jsonData);
  if (!validation.isValid) {
    return NextResponse.json(
      { error: validation.reason ?? "This doesn't look like a valid animation clip." },
      { status: 400 }
    );
  }

  const duration =
    typeof (jsonData as { duration?: unknown }).duration === "number"
      ? (jsonData as { duration: number }).duration
      : undefined;

  const glossName = gloss.trim().toUpperCase();
  const publicId = glossName.toLowerCase().replace(/\s+/g, "-");

  const upload = await uploadGlossJson(jsonData, publicId);

  await connectDB();
  const doc = await GlossModel.findOneAndUpdate(
    { gloss: glossName },
    {
      gloss: glossName,
      synonyms,
      cloudinaryUrl: upload.secure_url,
      cloudinaryPublicId: upload.public_id,
      rig: validation.rig,
      sourceAvatar,
      duration,
      boneCount: validation.boneCount,
    },
    { upsert: true, new: true }
  );

  return NextResponse.json({ ok: true, gloss: doc }, { status: 201 });
}
