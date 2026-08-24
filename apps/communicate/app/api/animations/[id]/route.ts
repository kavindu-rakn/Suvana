import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import GlossModel from "@/models/Gloss";
import { deleteGlossJson } from "@/lib/cloudinary";

/**
 * Removes a gloss from the dictionary: the Mongo index entry and the
 * Cloudinary JSON blob behind it.
 *
 * The Cloudinary delete is best-effort. If the blob is already gone (or the
 * call fails) the Mongo document is still removed — leaving an index entry
 * pointing at a dead URL is worse than leaving an orphaned blob, since the
 * former breaks playback and the latter is only wasted storage.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  await connectDB();
  const doc = await GlossModel.findById(id);
  if (!doc) {
    return NextResponse.json({ error: "Gloss not found" }, { status: 404 });
  }

  // Stored public ids include the "sign-glosses/" folder prefix that
  // deleteGlossJson adds back itself.
  const publicId = String(doc.cloudinaryPublicId).replace(/^sign-glosses\//, "");
  let blobDeleted = true;
  try {
    await deleteGlossJson(publicId);
  } catch {
    blobDeleted = false;
  }

  await doc.deleteOne();

  return NextResponse.json({ ok: true, blobDeleted });
}
