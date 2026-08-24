import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import ModelDoc from "@/models/Model";
import { uploadModelFile } from "@/lib/cloudinary";

// Raised from an initial conservative 15MB guess to 100MB after confirming
// this Cloudinary account accepts larger raw uploads fine. Surfaced
// client-side too (see FBX size check in the Settings uploader) so an
// oversized file is rejected instantly instead of after a slow upload.
// Note: if this app is ever deployed to a serverless platform (e.g.
// Vercel), that platform's own request body limit — commonly ~4.5MB on
// Vercel — applies on top of this and isn't something this constant can
// override; only local/self-hosted `next start` has no such ceiling.
const MAX_MODEL_FILE_BYTES = 100 * 1024 * 1024; // 100MB

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const modelList = await ModelDoc.find().sort({ name: 1 }).lean();
  return NextResponse.json({ models: modelList });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  const name = form?.get("name");
  const file = form?.get("file");

  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Missing 'name' field" }, { status: 400 });
  }
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "Missing 'file' (the .fbx model)" }, { status: 400 });
  }

  const filename = file instanceof File ? file.name : "model.fbx";
  if (!filename.toLowerCase().endsWith(".fbx")) {
    return NextResponse.json({ error: "Only .fbx files are accepted" }, { status: 400 });
  }
  if (file.size > MAX_MODEL_FILE_BYTES) {
    return NextResponse.json(
      {
        error: `This file is ${(file.size / 1024 / 1024).toFixed(1)}MB, which exceeds the ${
          MAX_MODEL_FILE_BYTES / 1024 / 1024
        }MB upload limit (Cloudinary's free tier caps raw uploads around this size). Try re-exporting without an embedded animation/unused textures, or compressing it first.`,
      },
      { status: 413 }
    );
  }

  const trimmedName = name.trim();
  const publicId = trimmedName.toLowerCase().replace(/\s+/g, "-");
  const buffer = await file.arrayBuffer();

  let upload;
  try {
    upload = await uploadModelFile(buffer, publicId, filename);
  } catch (err) {
    console.error("Cloudinary model upload failed:", err);
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: `Cloudinary rejected this upload: ${message}` }, { status: 502 });
  }

  await connectDB();
  const existingCount = await ModelDoc.countDocuments();
  const doc = await ModelDoc.findOneAndUpdate(
    { name: trimmedName },
    {
      name: trimmedName,
      cloudinaryUrl: upload.secure_url,
      cloudinaryPublicId: upload.public_id,
      fileSizeBytes: file.size,
      // First model ever added is activated automatically so there's
      // something to display without an extra manual step.
      ...(existingCount === 0 ? { isActive: true } : {}),
    },
    { upsert: true, new: true }
  );

  return NextResponse.json({ ok: true, model: doc }, { status: 201 });
}
