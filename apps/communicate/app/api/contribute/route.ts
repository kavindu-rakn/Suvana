import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { uploadVoiceSample } from "@/lib/cloudinary";
import VoiceSample from "@/models/VoiceSample";
import { SENTENCES, EMOTIONS } from "@/lib/data/recordingScript";

/**
 * Public endpoint for the emotion-dataset recorder (app/contribute).
 *
 * Deliberately unauthenticated: the point is to hand a link to volunteers who
 * will never have accounts. That means everything arriving here is untrusted,
 * so the sentence id, emotion and file are all validated against the script
 * rather than taken at face value, and the size cap is enforced server-side.
 */

/** 4 s of 16 kHz mono 16-bit is ~128 KB. 2 MB leaves generous headroom. */
const MAX_BYTES = 2 * 1024 * 1024;
const VALID_SENTENCES = new Set(SENTENCES.map((s) => s.id));
const VALID_EMOTIONS = new Set<string>(EMOTIONS);

/** Enough for the notebook's `spk<no>_<sentence>_<emotion>.wav` convention. */
function isSafeKey(value: string): boolean {
  return /^[A-Za-z0-9_-]{6,64}$/.test(value);
}

/**
 * Hands out "01", "02", … the first time a browser uploads.
 *
 * Counting distinct speakers is fine at this scale — the dataset is a few
 * hundred rows and a handful of contributors. Two people starting in the same
 * second could collide on a number; the speakerKey is what actually
 * distinguishes them, so the consequence is a duplicated label in a listing,
 * not mixed-up data.
 */
async function assignSpeakerNo(speakerKey: string): Promise<string> {
  const existing = await VoiceSample.findOne({ speakerKey }).select("speakerNo").lean();
  if (existing) return (existing as { speakerNo: string }).speakerNo;

  const keys = await VoiceSample.distinct("speakerKey");
  return String(keys.length + 1).padStart(2, "0");
}

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });
  }

  const audio = form.get("audio");
  const speakerKey = String(form.get("speakerKey") ?? "");
  const sentenceId = String(form.get("sentenceId") ?? "");
  const emotion = String(form.get("emotion") ?? "");
  const gender = String(form.get("gender") ?? "unspecified");
  const ageBand = String(form.get("ageBand") ?? "");
  const consented = String(form.get("consent") ?? "") === "true";

  if (!(audio instanceof Blob)) {
    return NextResponse.json({ error: "No audio file provided." }, { status: 400 });
  }
  if (!isSafeKey(speakerKey)) {
    return NextResponse.json({ error: "Invalid speaker key." }, { status: 400 });
  }
  if (!VALID_SENTENCES.has(sentenceId)) {
    return NextResponse.json({ error: "Unknown sentence." }, { status: 400 });
  }
  if (!VALID_EMOTIONS.has(emotion)) {
    return NextResponse.json({ error: "Unknown emotion." }, { status: 400 });
  }
  if (!consented) {
    // Recording someone's voice without a recorded yes is not something to
    // paper over with a default.
    return NextResponse.json({ error: "Consent is required." }, { status: 400 });
  }
  if (audio.size > MAX_BYTES) {
    return NextResponse.json({ error: "Recording is too large." }, { status: 413 });
  }
  if (audio.size < 1000) {
    return NextResponse.json({ error: "Recording is empty." }, { status: 400 });
  }

  const sentence = SENTENCES.find((s) => s.id === sentenceId)!;

  try {
    await connectDB();
    const speakerNo = await assignSpeakerNo(speakerKey);
    const fileName = `spk${speakerNo}_${sentenceId}_${emotion}.wav`;
    const publicId = `spk${speakerNo}_${speakerKey.slice(0, 8)}_${sentenceId}_${emotion}`;

    const uploaded = await uploadVoiceSample(await audio.arrayBuffer(), publicId);

    const durationSec = Number(form.get("durationSec")) || undefined;
    const peak = Number(form.get("peak")) || undefined;

    await VoiceSample.findOneAndUpdate(
      { speakerKey, sentenceId, emotion },
      {
        speakerKey,
        speakerNo,
        sentenceId,
        sentenceText: sentence.si,
        emotion,
        cloudinaryUrl: uploaded.secure_url,
        cloudinaryPublicId: uploaded.public_id,
        fileName,
        durationSec,
        peak,
        gender: ["female", "male", "other"].includes(gender) ? gender : "unspecified",
        ageBand: ageBand.slice(0, 16),
        consentedAt: new Date(),
        withdrawn: false,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const done = await VoiceSample.countDocuments({ speakerKey, withdrawn: false });
    return NextResponse.json({ ok: true, speakerNo, fileName, done });
  } catch (err) {
    console.error("Voice sample upload failed:", err);
    return NextResponse.json(
      { error: "Could not save that recording. Please try again." },
      { status: 500 }
    );
  }
}

/**
 * Progress for one browser, so a session can be resumed after a reload.
 * Returns only which slots are filled — never audio or anything identifying.
 */
export async function GET(req: NextRequest) {
  const speakerKey = req.nextUrl.searchParams.get("speakerKey") ?? "";
  if (!isSafeKey(speakerKey)) {
    return NextResponse.json({ error: "Invalid speaker key." }, { status: 400 });
  }

  try {
    await connectDB();
    const rows = await VoiceSample.find({ speakerKey, withdrawn: false })
      .select("sentenceId emotion speakerNo peak")
      .lean();

    return NextResponse.json({
      speakerNo: rows[0] ? (rows[0] as { speakerNo: string }).speakerNo : null,
      done: rows.map((r) => {
        const row = r as unknown as { sentenceId: string; emotion: string; peak?: number };
        return { sentenceId: row.sentenceId, emotion: row.emotion, peak: row.peak };
      }),
    });
  } catch (err) {
    console.error("Progress lookup failed:", err);
    return NextResponse.json({ error: "Could not load progress." }, { status: 500 });
  }
}
