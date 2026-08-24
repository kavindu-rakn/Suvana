import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import GlossModel from "@/models/Gloss";
import { uploadGlossJson } from "@/lib/cloudinary";
import { extractBoneNamesFromAnimationJson, validateMixamoSkeleton } from "@/lib/animation/mixamoBones";

// NOTE: gated behind "logged in" only for now. Add a real `role: "admin"`
// check on the User model before exposing this beyond trusted users.

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const glosses = await GlossModel.find().sort({ gloss: 1 }).lean();
  return NextResponse.json({ glosses });
}

const CreateSchema = z.object({
  gloss: z.string().trim().min(1),
  synonyms: z.array(z.string().trim().min(1)).default([]),
  jsonData: z.unknown(),
  previewImage: z.string().url().optional(),
});

/** Registers a new gloss from an inline JSON payload (no file upload). */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { gloss, synonyms, jsonData, previewImage } = parsed.data;

  // Defense in depth: re-validate server-side even though the FBX uploader
  // already checks this client-side — don't trust the client alone.
  const boneNames = extractBoneNamesFromAnimationJson(jsonData);
  const validation = validateMixamoSkeleton(boneNames);
  if (!validation.isValid) {
    return NextResponse.json(
      { error: validation.reason ?? "This doesn't look like a valid Mixamo animation." },
      { status: 400 }
    );
  }

  const publicId = gloss.toLowerCase().replace(/\s+/g, "-");

  const upload = await uploadGlossJson(jsonData, publicId);

  await connectDB();
  const doc = await GlossModel.findOneAndUpdate(
    { gloss: gloss.toUpperCase() },
    {
      gloss: gloss.toUpperCase(),
      synonyms,
      cloudinaryUrl: upload.secure_url,
      cloudinaryPublicId: upload.public_id,
      previewImage,
    },
    { upsert: true, new: true }
  );

  return NextResponse.json({ ok: true, gloss: doc }, { status: 201 });
}
