import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { saveSessionHistory } from "@/lib/history";

const BodySchema = z.object({
  audioText: z.string().min(1),
  emotion: z.string().optional(),
  confidence: z.number().nullable().optional(),
});

/** Logs a speech-to-text-only session (no gloss match) to the user's history. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const doc = await saveSessionHistory({
    userId: session.user.id,
    audioText: parsed.data.audioText,
    emotion: parsed.data.emotion,
    emotionConfidence: parsed.data.confidence ?? undefined,
  });

  return NextResponse.json({ ok: true, id: doc._id.toString() }, { status: 201 });
}
