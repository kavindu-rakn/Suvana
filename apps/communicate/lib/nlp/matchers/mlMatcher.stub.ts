import type { GlossCandidate, GlossMatch, GlossMatcher } from "./types";

/**
 * Placeholder for a trained text -> gloss model. It implements the same
 * `GlossMatcher` contract as `dictionaryMatcher.ts`, so it's a drop-in swap
 * once you have labeled (sentence -> gloss sequence) training data:
 *
 *   1. Train or host a model (classification over your gloss vocabulary, or
 *      a small seq2seq/transformer) that maps text -> ordered gloss tokens.
 *   2. Implement `match()` below to call that model (local inference or a
 *      hosted endpoint), then map its predicted gloss names back to entries
 *      in `candidates` to attach their Cloudinary animation URLs.
 *   3. Swap `dictionaryMatcher` for `mlMatcher` in
 *      app/api/gloss/predict/route.ts (or blend both, e.g. try ML first and
 *      fall back to the dictionary matcher for out-of-vocabulary gaps).
 */
export const mlMatcher: GlossMatcher = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- interface-required params for this placeholder
  match(text: string, candidates: GlossCandidate[]): GlossMatch[] {
    throw new Error(
      "mlMatcher is a placeholder — no trained model is wired up yet. Use dictionaryMatcher until labeled training data is available."
    );
  },
};
