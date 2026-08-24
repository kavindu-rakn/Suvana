import { connectDB } from "@/lib/db";
import SessionHistoryModel from "@/models/SessionHistory";

export interface GlossSequenceEntry {
  gloss: string;
  cloudinaryUrl: string;
  matchType: string;
  score: number;
}

export async function saveSessionHistory(params: {
  userId: string;
  audioText: string;
  emotion?: string;
  emotionConfidence?: number | null;
  glossSequence?: GlossSequenceEntry[];
}) {
  await connectDB();
  return SessionHistoryModel.create({
    userId: params.userId,
    audioText: params.audioText,
    emotion: params.emotion,
    emotionConfidence: params.emotionConfidence ?? undefined,
    glossSequence: params.glossSequence ?? [],
  });
}
