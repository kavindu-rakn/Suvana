import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import GlossModel from "@/models/Gloss";
import { dictionaryMatcher } from "@/lib/nlp/matchers/dictionaryMatcher";
import { matchSinhalaTokens } from "@/lib/nlp/matchers/sinhalaMatcher";
import { isSinhala, normalizeSinhala } from "@/lib/nlp/sinhala";
import { tokenize, isStopword } from "@/lib/nlp/preprocess";
import { saveSessionHistory } from "@/lib/history";
import type { GlossMatch } from "@/lib/nlp/matchers/types";

const BodySchema = z
  .object({
    // Primary path: raw Sinhala word tokens straight from the notebook's
    // tokenizer. Matched here rather than in the notebook so there is one
    // dictionary (MongoDB, editable from Dashboard -> Animations) and so
    // inflection and spelling variants get a chance — the notebook's old
    // exact lookup dropped anything it didn't recognise verbatim.
    tokens: z.array(z.string().trim().min(1)).optional(),
    // Legacy path: the notebook already resolved tokens -> gloss names.
    glosses: z.array(z.string().trim().min(1)).optional(),
    // Fallback path: manual/typed text (e.g. admin testing), matched with
    // the English dictionary/fuzzy matcher.
    text: z.string().trim().optional(),
    emotion: z.string().optional(),
    confidence: z.number().nullable().optional(),
  })
  .refine(
    (d) =>
      !!d.text ||
      (d.glosses && d.glosses.length > 0) ||
      (d.tokens && d.tokens.length > 0),
    { message: "Provide 'tokens', 'glosses', or 'text'" }
  );

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { tokens, glosses, text, emotion, confidence } = parsed.data;

  await connectDB();
  const glossDocs = await GlossModel.find().lean();

  if (glossDocs.length === 0) {
    return NextResponse.json(
      {
        error:
          "No signs are registered yet. Add one from Dashboard -> Animations before translating.",
      },
      { status: 503 }
    );
  }

  const candidates = glossDocs.map((g) => ({
    gloss: g.gloss,
    synonyms: g.synonyms ?? [],
    cloudinaryUrl: g.cloudinaryUrl,
  }));

  let matches: GlossMatch[];
  let unmatchedGlosses: string[] = [];
  /** Which branch resolved this request — surfaced so a silent miss is diagnosable. */
  let matchedVia: "tokens" | "glosses" | "text-sinhala" | "text-english";

  if (tokens && tokens.length > 0) {
    matchedVia = "tokens";
    const result = matchSinhalaTokens(tokens, candidates);
    matches = result.matches;
    unmatchedGlosses = result.unmatched;
  } else if (glosses && glosses.length > 0) {
    matchedVia = "glosses";
    // Normalize to Unicode NFC before comparing — scripts like Sinhala can
    // represent visually-identical text with different underlying byte
    // sequences (NFC vs NFD) depending on input method, which would
    // otherwise make an exact-looking gloss name silently fail to match.
    const normalize = (s: string) => s.normalize("NFC").trim().toUpperCase();
    const byName = new Map(candidates.map((c) => [normalize(c.gloss), c]));
    matches = [];
    for (const g of glosses) {
      const candidate = byName.get(normalize(g));
      if (candidate) {
        matches.push({
          gloss: candidate.gloss,
          cloudinaryUrl: candidate.cloudinaryUrl,
          matchType: "exact",
          score: 1,
        });
      } else {
        unmatchedGlosses.push(g);
      }
    }
  } else if (isSinhala(text ?? "")) {
    // A Sinhala transcript with no token list — older notebooks, or any client
    // that only sends text. Splitting on whitespace and running the same
    // Sinhala ladder beats the English matcher, which would score every word
    // against English gloss names and find nothing.
    matchedVia = "text-sinhala";
    const fallbackTokens = normalizeSinhala(text!).split(/\s+/).filter(Boolean);
    const result = matchSinhalaTokens(fallbackTokens, candidates);
    matches = result.matches;
    unmatchedGlosses = result.unmatched;
  } else {
    matchedVia = "text-english";
    matches = dictionaryMatcher.match(text!, candidates);
    // dictionaryMatcher doesn't report misses, so derive them: any content
    // word left over when nothing matched. Without this the caller gets an
    // empty result with no indication of what was searched for.
    if (matches.length === 0) {
      unmatchedGlosses = tokenize(text!).filter((t) => !isStopword(t));
    }
  }

  await saveSessionHistory({
    userId: session.user.id,
    audioText: text ?? tokens?.join(" ") ?? glosses?.join(" ") ?? "",
    emotion,
    emotionConfidence: confidence ?? undefined,
    glossSequence: matches,
  });

  return NextResponse.json({
    matches,
    unmatchedGlosses,
    matchedVia,
    dictionarySize: candidates.length,
  });
}
