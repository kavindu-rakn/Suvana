import { connectDB } from "@/lib/db";
import ModelDoc from "@/models/Model";

export interface ActiveModel {
  id: string;
  name: string;
  url: string;
}

/** Always reads fresh from Mongo — same "no stale cache" reasoning as lib/ngrok.ts. */
export async function getActiveModel(): Promise<ActiveModel | null> {
  await connectDB();
  const doc = await ModelDoc.findOne({ isActive: true }).lean<{
    _id: unknown;
    name: string;
    cloudinaryUrl: string;
  } | null>();
  if (!doc) return null;
  return { id: String(doc._id), name: doc.name, url: doc.cloudinaryUrl };
}

/** Sets one model active, unsetting any previously-active one first. */
export async function setActiveModel(id: string): Promise<void> {
  await connectDB();
  await ModelDoc.updateMany({ isActive: true }, { isActive: false });
  await ModelDoc.findByIdAndUpdate(id, { isActive: true });
}
