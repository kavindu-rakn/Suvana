// A small, dependency-free set of NLP-preprocessing helpers. Deliberately
// simple (no stemming library) so the whole matching pipeline stays fast,
// debuggable, and has no heavyweight/model-download dependencies.

const STOPWORDS = new Set([
  "a", "an", "the", "is", "am", "are", "was", "were", "be", "been", "being",
  "to", "of", "in", "on", "at", "for", "with", "and", "or", "but", "so",
  "i", "you", "he", "she", "it", "we", "they", "this", "that", "these", "those",
  "do", "does", "did", "will", "would", "can", "could", "should", "shall",
  "my", "your", "his", "her", "its", "our", "their", "me", "him", "us", "them",
  "please", "just", "very", "really",
]);

/** Normalizes Unicode form, lowercases, strips punctuation, splits into word tokens. */
export function tokenize(text: string): string[] {
  return text
    .normalize("NFC") // combining-mark scripts (e.g. Sinhala) can encode the
    // same visible text as different byte sequences (NFC vs NFD) depending
    // on input method — normalize before matching or lookups silently miss.
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

export function isStopword(token: string): boolean {
  return STOPWORDS.has(token);
}

/**
 * Generates candidate n-gram phrases (from `maxN` words down to 1) starting
 * at each position, so multi-word gloss synonyms (e.g. "thank you") can be
 * matched greedily before falling back to single words.
 */
export function ngramsFrom(tokens: string[], start: number, maxN: number): string[] {
  const phrases: string[] = [];
  for (let n = Math.min(maxN, tokens.length - start); n >= 1; n--) {
    phrases.push(tokens.slice(start, start + n).join(" "));
  }
  return phrases;
}
