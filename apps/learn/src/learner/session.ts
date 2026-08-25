import { practiceNeed } from './mastery'
import type { GlossMastery } from './mastery'
import { isSymbolLabel } from '../data/categories'

/**
 * A practice session: a small, finite set of signs with a completion state.
 *
 * Why this exists at all. PracticeView was an infinite chip picker — nothing
 * ever completed, so nothing was ever "enough". `suggestNext` already knew
 * which sign deserves attention; it was rendered as one line of body text
 * competing with a search box and 351 chips.
 *
 * There is also a measurement argument. The proposal target is "≥20% learning
 * gain after 10 sessions", and *session* was undefined inside the product a
 * participant actually uses. This gives that construct a referent.
 *
 * Built entirely on the existing learner model — no new scoring, no invented
 * data. The set is `suggestNext` generalised from one sign to N, so the same
 * policy that picked the suggestion picks the session.
 *
 * DESIGN BOUNDS, deliberately enforced here rather than left to the UI. This is
 * a research instrument used with human participants, so the motivation has to
 * be honest — competence and progress, never manufactured pressure:
 *
 *  - A session is ALWAYS finishable. A sign is done after one scored attempt,
 *    whatever the score. Gating completion on reaching 85 would trap a beginner
 *    in an unfinishable loop, which is the opposite of self-efficacy, and would
 *    bias the study toward participants who happen to score well early.
 *  - Nothing is ever withheld. The full vocabulary stays reachable at all times.
 *  - Nothing is time-gated, and there is no streak to lose.
 */
export interface PracticeSession {
  /**
   * Stamped onto every attempt made during this session, so the export can
   * segment by sitting. The proposal's learning-gain target is phrased "after
   * 10 sessions", which is uncountable without it.
   */
  id: string
  glosses: string[]
  /** Glosses with at least one scored attempt this session. */
  done: string[]
  startedAt: string
  /**
   * Mastery per gloss at the moment the session began, so the completion card
   * can report a real before→after change rather than re-deriving history.
   */
  startMastery: Record<string, number>
}

export const SESSION_SIZE = 5
const KEY = 'ssl-learn-session'

/**
 * How close two signs' practice needs must be before category is allowed to
 * separate them. Small on purpose: variety may break a near-tie, never override
 * a real difference in what the learner actually needs to practise.
 */
const TIE_EPSILON = 0.05

/**
 * The N signs most in need of practice, highest need first.
 *
 * Without `categoryOf` this is exactly `suggestNext` generalised from one sign
 * to N — same ranking, same alphabetical tie-break — which session.test.ts pins.
 *
 * `categoryOf` changes *ties only*, and exists because the ranking is degenerate
 * for a learner with no history: every sign scores 1.0, so something arbitrary
 * decides. Alphabetically that is "1, 100, 100 METERS, 1000, 10000" — the
 * corpus's earliest labels are numerals. Among signs of near-equal need this
 * prefers a word over a fingerspelled letter or a numeral, and then a category
 * not yet in the session. It claims only "vocabulary before symbols"; the order
 * within either group is untouched.
 *
 * Practice need always wins. Variety and word-preference can separate signs the
 * model rates the same; they can never promote a sign the learner needs less.
 */
export function buildSession(
  summaries: GlossMastery[],
  size: number = SESSION_SIZE,
  now: Date = new Date(),
  categoryOf?: (gloss: string) => string,
): string[] {
  const ranked = [...summaries].sort(
    (a, b) => practiceNeed(b, now) - practiceNeed(a, now) || a.gloss.localeCompare(b.gloss),
  )
  if (!categoryOf) return ranked.slice(0, size).map((s) => s.gloss)

  const remaining = [...ranked]
  const picked: GlossMastery[] = []
  const usedCategories = new Set<string>()

  while (picked.length < size && remaining.length > 0) {
    // Only signs the model rates within a hair of the best remaining are
    // eligible to be re-ordered.
    const bestNeed = practiceNeed(remaining[0], now)
    const bandEnd = remaining.findIndex((s) => practiceNeed(s, now) < bestNeed - TIE_EPSILON)
    const band = bandEnd === -1 ? remaining : remaining.slice(0, bandEnd)

    let choice = 0
    let bestScore = -1
    for (let i = 0; i < band.length; i++) {
      const gloss = band[i].gloss
      const category = categoryOf(gloss)
      // A word outranks a fresh category; both outrank neither.
      const score =
        (isSymbolLabel(gloss, category) ? 0 : 2) + (usedCategories.has(category) ? 0 : 1)
      if (score > bestScore) {
        bestScore = score
        choice = i
      }
    }

    const [chosen] = remaining.splice(choice, 1)
    picked.push(chosen)
    usedCategories.add(categoryOf(chosen.gloss))
  }

  return picked.map((s) => s.gloss)
}

export function startSession(
  summaries: GlossMastery[],
  size: number = SESSION_SIZE,
  now: Date = new Date(),
  categoryOf?: (gloss: string) => string,
): PracticeSession {
  const glosses = buildSession(summaries, size, now, categoryOf)
  const startMastery: Record<string, number> = {}
  for (const s of summaries) {
    if (glosses.includes(s.gloss)) startMastery[s.gloss] = s.mastery
  }
  return { id: crypto.randomUUID(), glosses, done: [], startedAt: now.toISOString(), startMastery }
}

/** The sign being worked on: the first one without a scored attempt yet. */
export function currentGloss(session: PracticeSession): string | null {
  return session.glosses.find((g) => !session.done.includes(g)) ?? null
}

export function isComplete(session: PracticeSession): boolean {
  return session.glosses.every((g) => session.done.includes(g))
}

/**
 * Record a scored attempt against the session.
 *
 * Any session gloss counts, not just the current one — practising ahead, or
 * wandering into a session sign from the picker, should never fail to register.
 * Returns the same object when nothing changed, so callers can skip a re-render.
 */
export function markAttempted(session: PracticeSession, gloss: string): PracticeSession {
  if (!session.glosses.includes(gloss) || session.done.includes(gloss)) return session
  return { ...session, done: [...session.done, gloss] }
}

// ---- persistence -----------------------------------------------------------
// sessionStorage, not localStorage: a session is meant to span a sitting, not
// to greet someone days later half-finished. It survives a reload — which
// matters mid-pilot — but never becomes a second source of truth. The IndexedDB
// attempt log stays canonical for everything that counts as progress.

export function loadSession(): PracticeSession | null {
  try {
    const raw = window.sessionStorage.getItem(KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isSession(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function saveSession(session: PracticeSession): void {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(session))
  } catch {
    /* storage unavailable — the session simply does not survive a reload */
  }
}

export function clearSession(): void {
  try {
    window.sessionStorage.removeItem(KEY)
  } catch {
    /* nothing to do */
  }
}

function isSession(value: unknown): value is PracticeSession {
  const s = value as PracticeSession
  return (
    !!s &&
    typeof s.id === 'string' &&
    Array.isArray(s.glosses) &&
    Array.isArray(s.done) &&
    typeof s.startedAt === 'string' &&
    !!s.startMastery &&
    typeof s.startMastery === 'object'
  )
}
