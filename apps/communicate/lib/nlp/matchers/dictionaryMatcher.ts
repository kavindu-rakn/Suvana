import { distance } from "fastest-levenshtein";
import { tokenize, isStopword, ngramsFrom } from "../preprocess";
import type { GlossCandidate, GlossMatch, GlossMatcher } from "./types";

const FUZZY_THRESHOLD = 0.72;
const MAX_PHRASE_WORDS = 4;

function normalizedSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - distance(a, b) / maxLen;
}

/**
 * Default GlossMatcher: exact/synonym dictionary lookup first (greedy,
 * longest-phrase-wins, so multi-word synonyms like "thank you" match before
 * single words do), falling back to Levenshtein-based fuzzy matching for
 * near-misses (typos, minor STT mis-transcriptions). No training data or
 * model runtime required — see mlMatcher.stub.ts for the future upgrade path.
 */
export const dictionaryMatcher: GlossMatcher = {
  match(text: string, candidates: GlossCandidate[]): GlossMatch[] {
    const phraseIndex = new Map<string, GlossCandidate>();
    const wordIndex = new Map<string, GlossCandidate>();

    for (const candidate of candidates) {
      const names = [candidate.gloss.replace(/[-_]/g, " "), ...candidate.synonyms];
      for (const raw of names) {
        const phrase = raw.normalize("NFC").trim().toLowerCase();
        if (!phrase) continue;
        if (!phraseIndex.has(phrase)) phraseIndex.set(phrase, candidate);
        for (const word of phrase.split(/\s+/)) {
          if (!wordIndex.has(word)) wordIndex.set(word, candidate);
        }
      }
    }

    const tokens = tokenize(text);
    const results: GlossMatch[] = [];
    let i = 0;

    while (i < tokens.length) {
      const phrases = ngramsFrom(tokens, i, MAX_PHRASE_WORDS);
      let matched = false;

      for (const phrase of phrases) {
        const candidate = phraseIndex.get(phrase);
        if (!candidate) continue;

        const isExact = phrase === candidate.gloss.normalize("NFC").toLowerCase().replace(/[-_]/g, " ");
        results.push({
          gloss: candidate.gloss,
          cloudinaryUrl: candidate.cloudinaryUrl,
          matchType: isExact ? "exact" : "synonym",
          score: 1,
        });
        i += phrase.split(/\s+/).length;
        matched = true;
        break;
      }
      if (matched) continue;

      const token = tokens[i];
      if (isStopword(token)) {
        i++;
        continue;
      }

      let bestScore = 0;
      let bestCandidate: GlossCandidate | null = null;
      for (const [word, candidate] of wordIndex) {
        const score = normalizedSimilarity(token, word);
        if (score > bestScore) {
          bestScore = score;
          bestCandidate = candidate;
        }
      }

      if (bestCandidate && bestScore >= FUZZY_THRESHOLD) {
        results.push({
          gloss: bestCandidate.gloss,
          cloudinaryUrl: bestCandidate.cloudinaryUrl,
          matchType: "fuzzy",
          score: Math.round(bestScore * 100) / 100,
        });
      }

      i++;
    }

    return results;
  },
};
