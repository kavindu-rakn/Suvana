/**
 * The assistant's knowledge base — the signs the recognition model was
 * trained on, and retrieval over them.
 *
 * This is a port of `SignKnowledgeBase` in
 * `services/recognition/webapp/assistant.py`, moved into the browser on
 * purpose. The Python original reads a **gitignored** data file that lives
 * beside a 3 GB TensorFlow service, which meant two things: the assistant
 * answered "0 signs" on any fresh checkout, and it died whenever the
 * recognition service was not running. Here the data ships as a committed
 * static asset (`public/data/signs.json`, built by
 * `scripts/build-sign-index.py`) and the retrieval runs client-side, so the
 * assistant works on the deployed static shell with no backend at all.
 *
 * Scoring is kept numerically identical to the Python version so that answers
 * do not drift between the two surfaces.
 */

export interface Sign {
  label: string
  sinhala: string
  category: string
  english: string
  /** Precomputed search text: normalised label + gloss + Sinhala script. */
  haystack: string
}

export interface SignCard {
  label: string
  sinhala: string
  english: string
  category: string
  categoryLabel: string
  tips: string[]
}

export const CATEGORY_LABEL: Record<string, string> = {
  letter: 'Fingerspelling letter',
  number: 'Number',
  month: 'Calendar month',
  phrase: 'Word / phrase',
}

// Honest, category-specific practice guidance. We deliberately do not invent
// handshape descriptions we have no reference for — instead we give the
// practice protocol that actually raises this model's recognition confidence.
export const CATEGORY_TIPS: Record<string, string[]> = {
  letter: [
    'Fingerspelling is a single static handshape — form it, then hold it still.',
    'Keep the hand at chest height, palm toward the camera, fingers clearly separated.',
    'Some letters have two accepted variants in this dataset; try both and use whichever the model reads more confidently.',
  ],
  number: [
    'Number signs are held rather than moved — settle the shape and keep it steady.',
    'Large numbers are compound: perform the parts in order without a long pause between them.',
    'Keep your other hand out of the frame so it is not mistaken for a two-handed sign.',
  ],
  month: [
    'Month signs are usually fingerspelled or initialised — start from the letter shape, then complete the movement.',
    'Perform it at a steady, even pace; rushing the movement is the most common cause of a missed detection.',
  ],
  phrase: [
    'This is a movement sign — the model reads the whole motion path, not a single frame.',
    'Start from a neutral rest position, perform the motion once cleanly, then return to rest.',
    'Keep your torso and both hands inside the frame; the model tracks pose and face as well as hands.',
  ],
}

export const GENERAL_TIPS = [
  'Sit about an arm’s length from the camera so your head, torso and both hands stay in frame.',
  'Light your face from the front — backlighting from a window is what breaks landmark tracking most often.',
  'Hold each sign for the full capture window; the model classifies a sequence of frames, not a snapshot.',
  'Use a plain background and avoid clothing that matches your skin tone.',
]

/** Sinhala occupies U+0D80–U+0DFF; keep it alongside ASCII alphanumerics. */
const NON_SEARCHABLE = /[^a-z0-9඀-෿ ]+/g

export function norm(text: string): string {
  return (text || '').toLowerCase().replace(NON_SEARCHABLE, ' ').trim()
}

export function tokens(text: string): string[] {
  return norm(text).split(' ').filter(Boolean)
}

/**
 * `difflib.SequenceMatcher(...).ratio()`, ported.
 *
 * The Python scoring leans on this for typo tolerance, so an approximation
 * (Levenshtein, Dice) would quietly change which sign wins a query. CPython's
 * "autojunk" heuristic only engages at 200+ elements and every label here is
 * far shorter, so it is correctly absent.
 */
export function ratio(a: string, b: string): number {
  const total = a.length + b.length
  if (!total) return 1

  // Index of every position each character occupies in b — the b2j map.
  const b2j = new Map<string, number[]>()
  for (let i = 0; i < b.length; i++) {
    const at = b2j.get(b[i])
    if (at) at.push(i)
    else b2j.set(b[i], [i])
  }

  const longestMatch = (alo: number, ahi: number, blo: number, bhi: number) => {
    let bestI = alo
    let bestJ = blo
    let bestSize = 0
    // j2len[j] = length of the longest match ending at a[i-1], b[j-1].
    let j2len = new Map<number, number>()

    for (let i = alo; i < ahi; i++) {
      const newJ2len = new Map<number, number>()
      for (const j of b2j.get(a[i]) ?? []) {
        if (j < blo) continue
        if (j >= bhi) break
        const k = (j2len.get(j - 1) ?? 0) + 1
        newJ2len.set(j, k)
        if (k > bestSize) {
          bestI = i - k + 1
          bestJ = j - k + 1
          bestSize = k
        }
      }
      j2len = newJ2len
    }
    return [bestI, bestJ, bestSize] as const
  }

  // Total matched characters, via the same divide-and-conquer recursion.
  let matches = 0
  const queue: Array<[number, number, number, number]> = [[0, a.length, 0, b.length]]
  while (queue.length) {
    const [alo, ahi, blo, bhi] = queue.pop()!
    const [i, j, k] = longestMatch(alo, ahi, blo, bhi)
    if (!k) continue
    matches += k
    if (alo < i && blo < j) queue.push([alo, i, blo, j])
    if (i + k < ahi && j + k < bhi) queue.push([i + k, ahi, j + k, bhi])
  }

  return (2 * matches) / total
}

export class SignKnowledgeBase {
  readonly entries: Sign[] = []
  readonly categories: Record<string, Sign[]> = {}

  // A hit must clear this score before we claim it answers the question.
  // Without a floor, fuzzy matching cheerfully returns a sign for "what is
  // quantum physics" — confidently wrong is the worst failure mode for a
  // teaching tool, so below the floor we say "not in this dataset" instead.
  static readonly MIN_SCORE = 38.0

  constructor(raw: Array<Omit<Sign, 'haystack'>> = []) {
    for (const meta of raw) {
      const entry: Sign = {
        label: meta.label,
        sinhala: meta.sinhala || meta.label,
        category: meta.category || 'phrase',
        english: meta.english || '',
        haystack: '',
      }
      entry.haystack = [norm(entry.label), norm(entry.english), entry.sinhala].join(' ')
      this.entries.push(entry)
      ;(this.categories[entry.category] ??= []).push(entry)
    }
  }

  get size(): number {
    return this.entries.length
  }

  search(query: string, limit = 6): Sign[] {
    const q = norm(query)
    if (!q) return []
    const qTokens = new Set(tokens(query))
    const scored: Array<[number, Sign]> = []

    for (const e of this.entries) {
      const labelN = norm(e.label)
      const engN = norm(e.english)
      let score = 0

      if (q === labelN || q === engN) score += 120
      // Substring credit only for queries long enough to be meaningful — a
      // 1-2 char query like "b" is a substring of half the dataset.
      if (q.length >= 3 && (labelN.includes(q) || (engN && engN.includes(q)))) score += 55
      if (q.length >= 2 && e.sinhala.includes(q)) score += 60

      let overlap = 0
      for (const t of tokens(e.haystack)) if (qTokens.has(t)) overlap++
      score += 18 * overlap

      // A short query that *is* a whole word of the label or gloss is a strong
      // signal even though it's too short for substring credit — this is what
      // makes "go", "K" and "eat" resolve correctly.
      const labelTokens = tokens(labelN)
      if (labelTokens.includes(q) || tokens(engN).includes(q)) score += 45
      if (labelTokens.length && labelTokens[0] === q) score += 30

      // Tie-break toward the concise, canonical sign: "yanawa" (to go) should
      // rank above "50 KM idiriyata yanna" for the query "go".
      score += Math.max(0, 12 - 2 * labelTokens.length)

      // Fuzzy match rescues typos and half-remembered Romanisation.
      const r = ratio(q, labelN)
      if (r > 0.62) score += r * 45
      if (engN) {
        const er = ratio(q, engN)
        if (er > 0.68) score += er * 30
      }

      if (score > 12) scored.push([score, e])
    }

    if (!scored.length) return []

    scored.sort((x, y) => y[0] - x[0] || x[1].label.toLowerCase().localeCompare(y[1].label.toLowerCase()))
    if (scored[0][0] < SignKnowledgeBase.MIN_SCORE) return []

    // Keep only results in the same quality band as the best one, so a strong
    // match isn't padded out with weak noise.
    const cutoff = Math.max(SignKnowledgeBase.MIN_SCORE * 0.62, scored[0][0] * 0.42)
    return scored.slice(0, limit).filter(([s]) => s >= cutoff).map(([, e]) => e)
  }

  card(entry: Sign): SignCard {
    return {
      label: entry.label,
      sinhala: entry.sinhala,
      english: entry.english,
      category: entry.category,
      categoryLabel: CATEGORY_LABEL[entry.category] ?? 'Sign',
      tips: CATEGORY_TIPS[entry.category] ?? CATEGORY_TIPS.phrase,
    }
  }

  statsLine(): string {
    const parts: string[] = []
    for (const c of ['letter', 'number', 'month', 'phrase']) {
      const items = this.categories[c]
      if (items?.length) parts.push(`${items.length} ${(CATEGORY_LABEL[c] ?? c).toLowerCase()}s`)
    }
    return `${this.entries.length} signs in total — ${parts.join(', ')}`
  }
}

/**
 * Load the committed sign index. A failure here is not fatal: the assistant
 * falls back to an empty knowledge base and says so, rather than throwing on
 * the landing page.
 */
export async function loadKnowledgeBase(url: string): Promise<SignKnowledgeBase> {
  try {
    const res = await fetch(url, { cache: 'force-cache' })
    if (!res.ok) throw new Error(`${res.status}`)
    const data = await res.json()
    return new SignKnowledgeBase(data?.signs ?? [])
  } catch {
    return new SignKnowledgeBase([])
  }
}
