import { connectDB } from "@/lib/db";
import VoiceSample from "@/models/VoiceSample";
import { SENTENCES, EMOTIONS, TOTAL_TAKES } from "@/lib/data/recordingScript";
import { DatasetClient } from "./DatasetClient";

export const dynamic = "force-dynamic";

/**
 * Collection progress for the emotion dataset.
 *
 * Counts are aggregated on the server so the page shows real numbers on first
 * paint rather than a spinner — the whole point is to glance at it and see
 * whether enough has come in to train.
 */
export default async function DatasetPage() {
  let rows: Array<{ speakerNo: string; emotion: string; peak?: number; gender?: string }> = [];
  let error: string | null = null;

  try {
    await connectDB();
    rows = (await VoiceSample.find({ withdrawn: false })
      .select("speakerNo emotion peak gender")
      .lean()) as unknown as typeof rows;
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not reach the database.";
  }

  const speakers = [...new Set(rows.map((r) => r.speakerNo))].sort();
  const perSpeaker = speakers.map((s) => {
    const mine = rows.filter((r) => r.speakerNo === s);
    return {
      speaker: s,
      total: mine.length,
      gender: mine[0]?.gender ?? "unspecified",
      byEmotion: Object.fromEntries(
        EMOTIONS.map((e) => [e, mine.filter((r) => r.emotion === e).length])
      ) as Record<string, number>,
    };
  });

  const quiet = rows.filter((r) => (r.peak ?? 1) < 0.03).length;
  const clipped = rows.filter((r) => (r.peak ?? 0) > 0.99).length;

  return (
    <DatasetClient
      error={error}
      total={rows.length}
      perSpeaker={perSpeaker}
      emotions={[...EMOTIONS]}
      sentenceCount={SENTENCES.length}
      takesPerSpeaker={TOTAL_TAKES}
      quiet={quiet}
      clipped={clipped}
    />
  );
}
