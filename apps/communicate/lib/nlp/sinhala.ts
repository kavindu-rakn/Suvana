/**
 * Sinhala-aware text helpers for gloss matching.
 *
 * Plain edit distance over code points does badly on Sinhala for two reasons:
 *
 *  1. A visible letter is often several code points. "කො" is ක + ො, so
 *     code-point distance counts one wrong letter as two edits and
 *     overstates how different two words are.
 *  2. The errors that actually happen — from Whisper and from typists — are
 *     systematic, not random. Long/short vowels and aspirated/unaspirated
 *     consonants get swapped constantly (ේ vs ෙ, ත vs ථ, ල vs ළ). Those are
 *     one edit each but they're *predictable*, so a phonetic key catches
 *     them more reliably than a distance threshold.
 *
 * Everything here is pure and dependency-free so it can run on the server,
 * in a script, or in a test without setup.
 */

/** Zero-width joiner / non-joiner. Sinhala uses ZWJ to form conjuncts (e.g. ්‍ය),
 *  and whether it survives depends on the keyboard and the ASR decoder. */
const ZERO_WIDTH = /[‌‍]/g;

const SINHALA_RANGE = /[඀-෿]/;

/** Sinhala block plus the punctuation we want to drop. */
const PUNCTUATION = /[^\p{L}\p{N}\s'඀-෿]/gu;

export function isSinhala(text: string): boolean {
  return SINHALA_RANGE.test(text);
}

/**
 * The normalisation every comparison starts from: compose to NFC, drop
 * zero-width joiners, strip punctuation, collapse whitespace.
 *
 * NFC matters because the same visible word can be encoded two ways
 * depending on input method, and an exact-looking match then silently fails.
 */
export function normalizeSinhala(text: string): string {
  return text
    .normalize("NFC")
    .replace(ZERO_WIDTH, "")
    .replace(PUNCTUATION, " ")
    .trim()
    .replace(/\s+/g, " ");
}

let segmenter: Intl.Segmenter | null = null;

/**
 * Grapheme splitting is the hot path — every similarity comparison needs it,
 * and `Intl.Segmenter` allocates an iterator per call. The same few hundred
 * dictionary words get split over and over within a request, so results are
 * memoised. Bounded so a long-running server can't grow it without limit.
 */
const graphemeCache = new Map<string, string[]>();
const GRAPHEME_CACHE_LIMIT = 5000;

/**
 * Splits into user-perceived characters, so a consonant plus its vowel sign
 * counts as one unit rather than two.
 */
export function graphemes(text: string): string[] {
  const cached = graphemeCache.get(text);
  if (cached) return cached;

  if (!segmenter) segmenter = new Intl.Segmenter("si", { granularity: "grapheme" });
  const split = [...segmenter.segment(text)].map((s) => s.segment);

  if (graphemeCache.size >= GRAPHEME_CACHE_LIMIT) graphemeCache.clear();
  graphemeCache.set(text, split);
  return split;
}

/* ------------------------------------------------------------------ */
/*  Phonetic key                                                      */
/* ------------------------------------------------------------------ */

/**
 * Consonants that sound close enough to be confused, collapsed to one symbol.
 * Aspirated/unaspirated and dental/retroflex pairs are the big offenders —
 * Sinhala orthography distinguishes them but speech often doesn't.
 */
const CONSONANT_CLASSES: Record<string, string> = {
  "ක": "K", "ඛ": "K", "ග": "K", "ඝ": "K", "ඟ": "K",
  "ච": "C", "ඡ": "C", "ජ": "C", "ඣ": "C", "ඤ": "N", "ඥ": "N",
  "ට": "T", "ඨ": "T", "ත": "T", "ථ": "T", "ඬ": "D",
  "ඩ": "D", "ඪ": "D", "ද": "D", "ධ": "D", "ඳ": "D",
  "ණ": "N", "න": "N", "ඞ": "N",
  "ප": "P", "ඵ": "P", "බ": "P", "භ": "P", "ම": "M", "ඹ": "M",
  "ය": "Y", "ර": "R", "ල": "L", "ළ": "L", "ව": "V",
  "ශ": "S", "ෂ": "S", "ස": "S", "හ": "H", "ෆ": "P",
};

/** Vowel signs and independent vowels, with long/short folded together. */
const VOWEL_CLASSES: Record<string, string> = {
  "අ": "A", "ආ": "A", "ා": "A",
  "ඇ": "E", "ඈ": "E", "ැ": "E", "ෑ": "E",
  "ඉ": "I", "ඊ": "I", "ි": "I", "ී": "I",
  "උ": "U", "ඌ": "U", "ු": "U", "ූ": "U",
  "ඍ": "U", "ෘ": "U", "ෲ": "U",
  "එ": "E", "ඒ": "E", "ෙ": "E", "ේ": "E",
  "ඓ": "E", "ෛ": "E",
  "ඔ": "O", "ඕ": "O", "ො": "O", "ෝ": "O",
  "ඖ": "O", "ෞ": "O",
};

/** Hal kirima — kills the inherent vowel. Carries no sound of its own. */
const VIRAMA = "්";
/** Anusvara / visarga. */
const ANUSVARA = "ං";
const VISARGA = "ඃ";

/**
 * Reduces a word to a coarse "how it sounds" key.
 *
 * Two words with the same key are near-certainly the same word spelled
 * differently, which makes this both a matcher and — more usefully — a
 * *blocking key*: bucket the dictionary by it once, and a lookup compares
 * against a handful of candidates instead of all of them.
 */
export function phoneticKey(word: string): string {
  const normalized = normalizeSinhala(word);
  let key = "";
  let lastEmitted = "";

  for (const char of normalized) {
    if (char === VIRAMA) continue;
    if (char === ANUSVARA) {
      if (lastEmitted !== "N") key += (lastEmitted = "N");
      continue;
    }
    if (char === VISARGA) {
      if (lastEmitted !== "H") key += (lastEmitted = "H");
      continue;
    }

    const symbol = CONSONANT_CLASSES[char] ?? VOWEL_CLASSES[char];
    if (!symbol) continue;

    // Collapse doubled sounds — gemination is inconsistently transcribed.
    if (symbol === lastEmitted) continue;
    key += symbol;
    lastEmitted = symbol;
  }

  return key;
}

/* ------------------------------------------------------------------ */
/*  Morphology                                                        */
/* ------------------------------------------------------------------ */

/**
 * Inflectional endings Sinhala glues onto words, longest first so the
 * greediest strip is tried before a shorter one that's a prefix of it.
 *
 * This is the fix for the "කොහෙදද" case: the question particle ද is simply
 * appended, and stripping it recovers the dictionary form exactly. An exact
 * hit after stripping is far more trustworthy than a fuzzy guess, which is
 * why this rung sits above fuzzy matching in the ladder.
 */
const SUFFIXES = [
  "නවා", "න්නේ", "න්න", "ගෙන්", "වලින්", "වලට", "වල",
  "ගේ", "ෙන්", "ින්", "න්", "ලා", "යි", "වා", "මු", "ති",
  "ක්", "ට", "ද", "ෙ", "ේ", "ම",
];

/** Below this many graphemes a stripped form is too short to trust. */
const MIN_STEM_GRAPHEMES = 2;
/** Strip at most this many endings — Sinhala can stack them, but not deeply. */
const MAX_STRIP_DEPTH = 2;

/**
 * Progressively suffix-stripped forms of a word, most-complete first.
 * Always includes the original.
 */
export function stemVariants(word: string): string[] {
  const start = normalizeSinhala(word);
  const seen = new Set<string>([start]);
  const out = [start];

  let frontier = [start];
  for (let depth = 0; depth < MAX_STRIP_DEPTH; depth++) {
    const next: string[] = [];
    for (const form of frontier) {
      for (const suffix of SUFFIXES) {
        if (!form.endsWith(suffix) || form.length <= suffix.length) continue;
        const stem = form.slice(0, -suffix.length);
        if (graphemes(stem).length < MIN_STEM_GRAPHEMES) continue;
        if (seen.has(stem)) continue;
        seen.add(stem);
        out.push(stem);
        next.push(stem);
      }
    }
    if (next.length === 0) break;
    frontier = next;
  }

  return out;
}

/* ------------------------------------------------------------------ */
/*  Similarity                                                        */
/* ------------------------------------------------------------------ */

/** Levenshtein over an array of units (graphemes), not characters. */
function levenshtein(a: string[], b: string[]): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    previous = current;
  }
  return previous[b.length];
}

/**
 * Similarity over already-split graphemes.
 *
 * `floor` lets the caller skip work it can't use: if the two lengths differ
 * by more than the edit budget the floor allows, no alignment can clear it,
 * so return early instead of filling in the matrix. That's what keeps a
 * full-dictionary scan cheap.
 */
export function similarityFromGraphemes(a: string[], b: string[], floor = 0): number {
  const longest = Math.max(a.length, b.length);
  if (longest === 0) return 1;
  if (floor > 0 && Math.abs(a.length - b.length) / longest > 1 - floor) return 0;
  return 1 - levenshtein(a, b) / longest;
}

/**
 * 0..1 similarity measured on grapheme clusters, so one wrong letter counts
 * as one edit whether or not it happens to be multi-code-point.
 */
export function graphemeSimilarity(a: string, b: string, floor = 0): number {
  return similarityFromGraphemes(
    graphemes(normalizeSinhala(a)),
    graphemes(normalizeSinhala(b)),
    floor
  );
}
