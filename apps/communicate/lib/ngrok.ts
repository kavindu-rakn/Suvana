import { connectDB } from "@/lib/db";
import ConfigModel from "@/models/Config";

const NGROK_KEY = "ngrok_url";

/**
 * Always reads the latest registered ngrok URL from MongoDB rather than a
 * hardcoded/env value, so the app keeps working across notebook restarts
 * (see notebook-integration/register_ngrok_url.py for the writer side).
 */
export async function getNgrokUrl(): Promise<string | null> {
  await connectDB();
  const doc = await ConfigModel.findOne({ key: NGROK_KEY }).lean<{ value: string } | null>();
  return doc?.value ?? null;
}

export async function setNgrokUrl(url: string): Promise<void> {
  await connectDB();
  await ConfigModel.findOneAndUpdate(
    { key: NGROK_KEY },
    { value: url.replace(/\/+$/, "") },
    { upsert: true }
  );
}
