import {
  graphemes,
  normalizeSinhala,
  phoneticKey,
  similarityFromGraphemes,
  stemVariants,
} from "../sinhala";
import type { GlossCandidate, GlossMatch } from "./types";

/**
 * Sinhala token -> gloss matcher.
 *
 * Replaces the notebook's exact `SINHALA_TO_GLOSS.get(token)` lookup, which
 * dropped any word it didn't recognise verbatim into `unknown_tokens` — so a
 * single extra particle ("කොහෙද" vs "කොහෙදද") lost the sign entirely, and the
 * app never got a chance to recover it.
 *
 * Matching runs as a ladder, most-trustworthy rung first. Each rung is
 * indexed rather than scanned, so cost stays flat as the dictionary grows
 * toward SSL400:
 *
 *   1. exact          — O(1) map hit on the normalised word
 *   2. stem           — O(suffixes) map hits after stripping inflection
 *   3. phonetic       — O(1) bucket hit; catches ේ/ෙ, ත/ථ, ල/ළ swaps
 *   4. fuzzy          — grapheme edit distance, but only *within* the
 *                       phonetic bucket, so it compares against a handful of
 *                       words rather than the whole dictionary
 *
 * A full scan only happens as a last resort when the phonetic bucket is
 * empty, which is the case where there's nothing cheaper to try anyway.
 */

/**
 * A phonetic key this long is specific enough to trust on its own.
 *
 * This matters: the whole point of the key is to match words whose *spelling*
 * differs, so gating a bucket hit on spelling similarity defeats it. "කොහේද"
 * and "කොහෙද" share the key KOHED but are only 0.67 similar by edit distance
 * — gating at 0.78 threw away exactly the case the key exists to catch.
 * Short keys still need the guard, because they collide (ම and මම both
 * reduce to "M").
 */
const TRUSTED_KEY_LENGTH = 3;
/** Guard for short, collision-prone keys. */
const SHORT_KEY_THRESHOLD = 0.7;
/** Full-scan fallback is held to a higher bar — it has far more chances to be wrong. */
const SCAN_THRESHOLD = 0.86;

const SCORES = {
  exact: 1,
  synonym: 1,
  stem: 0.95,
  phonetic: 0.9,
} as const;

interface IndexedEntry {
  /** Normalised surface form this entry was built from. */
  form: string;
  /** Pre-split once at index time; comparisons run thousands of times. */
  formGraphemes: string[];
  candidate: GlossCandidate;
  /** True when `form` is the gloss's own name rather than a synonym. */
  isGlossName: boolean;
}

export interface SinhalaIndex {
  exact: Map<string, IndexedEntry>;
  phonetic: Map<string, IndexedEntry[]>;
  all: IndexedEntry[];
}

/**
 * Builds the lookup structures once per request. Cheap enough at SSL400
 * scale (a few hundred entries) that caching it would add staleness risk for
 * no measurable gain.
 */
export function buildSinhalaIndex(candidates: GlossCandidate[]): SinhalaIndex {
  const exact = new Map<string, IndexedEntry>();
  const phonetic = new Map<string, IndexedEntry[]>();
  const all: IndexedEntry[] = [];

  for (const candidate of candidates) {
    // The gloss name is usually English ("WHERE"); the Sinhala words live in
    // `synonyms`. Both are indexed so either can be spoken or typed.
    const forms: Array<{ raw: string; isGlossName: boolean }> = [
      { raw: candidate.gloss, isGlossName: true },
      ...candidate.synonyms.map((s) => ({ raw: s, isGlossName: false })),
    ];

    for (const { raw, isGlossName } of forms) {
      const form = normalizeSinhala(raw).toLowerCase();
      if (!form) continue;

      const entry: IndexedEntry = {
        form,
        formGraphemes: graphemes(form),
        candidate,
        isGlossName,
      };
      all.push(entry);
      if (!exact.has(form)) exact.set(form, entry);

      const key = phoneticKey(form);
      if (!key) continue;
      const bucket = phonetic.get(key);
      if (bucket) bucket.push(entry);
      else phonetic.set(key, [entry]);
    }
  }

  return { exact, phonetic, all };
}

export interface TokenMatch {
  token: string;
  match: GlossMatch | null;
}

/** Resolves one Sinhala token through the ladder. */
export function matchToken(token: string, index: SinhalaIndex): GlossMatch | null {
  const normalized = normalizeSinhala(token).toLowerCase();
  if (!normalized) return null;

  // 1 — exact
  const exact = index.exact.get(normalized);
  if (exact) {
    return toMatch(exact, exact.isGlossName ? "exact" : "synonym");
  }

  // 2 — stem. stemVariants() returns the original first, already tried above.
  for (const stem of stemVariants(normalized).slice(1)) {
    const hit = index.exact.get(stem.toLowerCase());
    if (hit) return toMatch(hit, "stem");
  }

  // 3/4 — phonetic bucket, then fuzzy within it
  const key = phoneticKey(normalized);
  const bucket = key ? index.phonetic.get(key) : undefined;

  const tokenGraphemes = graphemes(normalized);

  if (bucket && bucket.length > 0) {
    // Spelling similarity only picks *between* same-sounding options; it does
    // not gate a long key. See TRUSTED_KEY_LENGTH.
    let best = bucket[0];
    let bestScore = -1;
    for (const entry of bucket) {
      const score = similarityFromGraphemes(tokenGraphemes, entry.formGraphemes);
      if (score > bestScore) {
        bestScore = score;
        best = entry;
      }
    }
    if (key.length >= TRUSTED_KEY_LENGTH || bestScore >= SHORT_KEY_THRESHOLD) {
      return toMatch(best, "phonetic");
    }
  }

  // Last resort — compare against everything, at a stricter bar, because a
  // full scan has far more opportunities to land on the wrong sign. The floor
  // lets length-mismatched entries bail before the matrix is built.
  let best: IndexedEntry | null = null;
  let bestScore = 0;
  for (const entry of index.all) {
    const score = similarityFromGraphemes(tokenGraphemes, entry.formGraphemes, SCAN_THRESHOLD);
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }

  if (best && bestScore >= SCAN_THRESHOLD) {
    return { ...toMatch(best, "fuzzy"), score: round(bestScore) };
  }

  return null;
}

function toMatch(entry: IndexedEntry, matchType: GlossMatch["matchType"]): GlossMatch {
  return {
    gloss: entry.candidate.gloss,
    cloudinaryUrl: entry.candidate.cloudinaryUrl,
    matchType,
    score: matchType in SCORES ? SCORES[matchType as keyof typeof SCORES] : SCAN_THRESHOLD,
  };
}

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * Matches a list of Sinhala tokens, reporting which ones found nothing so the
 * UI can show what's missing from the dictionary rather than silently
 * dropping it.
 */
export function matchSinhalaTokens(
  tokens: string[],
  candidates: GlossCandidate[]
): { matches: GlossMatch[]; unmatched: string[] } {
  const index = buildSinhalaIndex(candidates);
  const matches: GlossMatch[] = [];
  const unmatched: string[] = [];

  for (const token of tokens) {
    const match = matchToken(token, index);
    if (match) matches.push(match);
    else if (normalizeSinhala(token)) unmatched.push(token);
  }

  return { matches, unmatched };
}
