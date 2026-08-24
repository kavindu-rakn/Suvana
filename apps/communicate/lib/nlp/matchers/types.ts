export interface GlossCandidate {
  gloss: string;
  synonyms: string[];
  cloudinaryUrl: string;
}

export interface GlossMatch {
  gloss: string;
  cloudinaryUrl: string;
  /**
   * How the word was resolved, most trustworthy first:
   *   exact/synonym — verbatim dictionary hit
   *   stem          — hit after stripping Sinhala inflection (කොහෙදද -> කොහෙද)
   *   phonetic      — same sound key, e.g. ේ/ෙ or ත/ථ swapped
   *   fuzzy         — closest spelling above a threshold
   *   ml            — from a trained model (see mlMatcher.stub.ts)
   */
  matchType: "exact" | "synonym" | "stem" | "phonetic" | "fuzzy" | "ml";
  /** 0..1 confidence-ish score. Exact/synonym matches are always 1. */
  score: number;
}

/**
 * Common contract for anything that turns recognized text into an ordered
 * sequence of gloss matches. `dictionaryMatcher.ts` is the default
 * implementation today; `mlMatcher.stub.ts` shows where a trained model can
 * be dropped in later without touching callers (see /api/gloss/predict).
 */
export interface GlossMatcher {
  match(text: string, candidates: GlossCandidate[]): GlossMatch[];
}
