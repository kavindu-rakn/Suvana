import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import VoiceSample from "@/models/VoiceSample";
import { SENTENCES, EMOTIONS } from "@/lib/data/recordingScript";

/**
 * Dataset manifest for training — authenticated, unlike the collection
 * endpoint. Anyone may contribute a recording; only the project owner gets a
 * listing of everything collected.
 *
 * Returns a JSON file to download and hand to the notebook, rather than
 * exposing a public URL the notebook could fetch directly. The Cloudinary
 * URLs inside are themselves public, but the *index* of who recorded what
 * stays behind the login.
 *
 * `?minPeak=` drops takes quieter than a threshold. Near-silent clips are the
 * most common flaw in volunteer-collected audio and they poison the energy
 * features, so filtering at export is cheaper than discovering them at
 * training time.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const minPeak = Number(req.nextUrl.searchParams.get("minPeak") ?? "0");

  try {
    await connectDB();
    const rows = await VoiceSample.find({ withdrawn: false })
      .select("speakerNo speakerKey sentenceId sentenceText emotion cloudinaryUrl fileName durationSec peak gender ageBand createdAt")
      .sort({ speakerNo: 1, sentenceId: 1, emotion: 1 })
      .lean();

    const all = rows as unknown as Array<{
      speakerNo: string; speakerKey: string; sentenceId: string; sentenceText: string;
      emotion: string; cloudinaryUrl: string; fileName: string;
      durationSec?: number; peak?: number; gender?: string; ageBand?: string;
    }>;

    const kept = all.filter((r) => (r.peak ?? 1) >= minPeak);

    const speakers = [...new Set(kept.map((r) => r.speakerNo))].sort();
    const perEmotion = Object.fromEntries(
      EMOTIONS.map((e) => [e, kept.filter((r) => r.emotion === e).length])
    );
    const perSpeaker = Object.fromEntries(
      speakers.map((s) => [s, kept.filter((r) => r.speakerNo === s).length])
    );

    const manifest = {
      generatedAt: new Date().toISOString(),
      totals: {
        samples: kept.length,
        excludedByPeak: all.length - kept.length,
        speakers: speakers.length,
        sentences: SENTENCES.length,
        expectedIfComplete: speakers.length * SENTENCES.length * EMOTIONS.length,
        perEmotion,
        perSpeaker,
      },
      // Kept alongside the audio so a manifest is self-describing months later.
      script: SENTENCES,
      samples: kept.map((r) => ({
        fileName: r.fileName,
        url: r.cloudinaryUrl,
        speaker: r.speakerNo,
        sentenceId: r.sentenceId,
        sentenceText: r.sentenceText,
        emotion: r.emotion,
        durationSec: r.durationSec,
        peak: r.peak,
        gender: r.gender,
        ageBand: r.ageBand,
      })),
    };

    return new NextResponse(JSON.stringify(manifest, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": 'attachment; filename="emotion_dataset_manifest.json"',
      },
    });
  } catch (err) {
    console.error("Dataset export failed:", err);
    return NextResponse.json({ error: "Could not build the manifest." }, { status: 500 });
  }
}
