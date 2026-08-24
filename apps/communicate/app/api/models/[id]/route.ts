import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import ModelDoc from "@/models/Model";
import { deleteModelFile } from "@/lib/cloudinary";
import { setActiveModel } from "@/lib/activeModel";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);

  if (body?.action !== "activate") {
    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  }

  await connectDB();
  const doc = await ModelDoc.findById(id).lean();
  if (!doc) {
    return NextResponse.json({ error: "Model not found" }, { status: 404 });
  }

  await setActiveModel(id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  await connectDB();
  const doc = await ModelDoc.findById(id);
  if (!doc) {
    return NextResponse.json({ error: "Model not found" }, { status: 404 });
  }

  await deleteModelFile(doc.cloudinaryPublicId).catch((err) =>
    console.error("Failed to delete Cloudinary model asset:", err)
  );
  await doc.deleteOne();

  return NextResponse.json({ ok: true });
}
