import { isDueReview, practiceNeed, recommendationFor } from './mastery'
import { isSentenceGloss } from '../data/sentences'
import type { GlossMastery, PracticeRecommendation } from './mastery'
import { isSymbolLabel } from '../data/categories'
import type { CurriculumUnit } from '../data/curriculum'

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
 * Built on the existing learner model — no new scoring or invented data.
 * One-off Next is strictly due-first; finite sessions mix reviews with new
 * signs. The reasons stored here explain that planned sequence to the learner.
 *
 * DESIGN BOUNDS, deliberately enforced here rather than left to the UI. This is
 * intended for learning, with no participant results or learning gains claimed.
 * Sessions support competence and progress, never manufactured pressure:
 *
 *  - A session is ALWAYS finishable. A sign is done after one scored attempt,
 *    whatever the score. Gating completion on reaching 85 would trap a beginner
 *    in an unfinishable loop, which is the opposite of self-efficacy, and would
 *    bias the study toward participants who happen to score well early.
 *  - Nothing is ever withheld. The full vocabulary stays reachable at all times.
 *  - No session is time-gated. Goal-day streaks in game.ts are separate and
 *    never prevent practice or completing a session.
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
  /** Optional for older saved sessions; reasons are captured at session start. */
  recommendations?: PracticeRecommendation[]
  unitId?: string
}

export const SESSION_SIZE = 5
export const UNIT_SESSION_SIZE = 8
export const REVIEWS_PER_NEW = 2
const KEY = 'ssl-learn-session'

/**
 * How close two signs' practice needs must be before category is allowed to
 * separate them. Small on purpose: variety may break a near-tie, never override
 * a real difference in what the learner actually needs to practise.
 */
const TIE_EPSILON = 0.05 // Untuned category-variety tolerance, not a score boundary.

/**
 * Finite-session policy: up to two distinct due reviews, then one new sign.
 * The single-Next policy in mastery.ts is strictly due-first; the session mix
 * is the plan's explicit 2:1 interleave. If a queue runs out, use the other;
 * only after both run out use attempted signs that are not due.
 * Category variety breaks near-ties inside a queue, never review/new priority.
 * Explicit unit order wins over category/word preferences for new signs.
 */
export function buildSessionPlan(
  summaries: readonly GlossMastery[],
  size: number = SESSION_SIZE,
  now: Date = new Date(),
  categoryOf?: (gloss: string) => string,
  newOrder?: readonly string[],
): PracticeRecommendation[] {
  if (!Number.isFinite(size) || size < 1) return []
  const limit = Math.floor(size)
  const unique = [...new Map(summaries.filter(summary => !isSentenceGloss(summary.gloss))
    .map((summary) => [summary.gloss, summary])).values()]
  const rank = (a: GlossMastery, b: GlossMastery) =>
    practiceNeed(b, now) - practiceNeed(a, now) || a.gloss.localeCompare(b.gloss)
  const reviews = unique.filter((summary) => isDueReview(summary, now)).sort(rank)
  const unseen = unique.filter((summary) => summary.attempts === 0
    && (newOrder === undefined || newOrder.includes(summary.gloss))).sort((a, b) =>
    newOrder === undefined ? a.gloss.localeCompare(b.gloss) : newOrder.indexOf(a.gloss) - newOrder.indexOf(b.gloss))
  const other = unique.filter((summary) => summary.attempts > 0 && !isDueReview(summary, now)
    && (newOrder === undefined || newOrder.includes(summary.gloss))).sort(rank)
  const picked: PracticeRecommendation[] = []
  const usedCategories = new Set<string>()
  const take = (queue: GlossMastery[], preserveOrder = false) => {
    if (!queue.length || picked.length >= limit) return
    let choice = 0
    if (categoryOf && !preserveOrder) {
      const bestNeed = practiceNeed(queue[0], now)
      let bestScore = -1
      for (let i = 0; i < queue.length && practiceNeed(queue[i], now) >= bestNeed - TIE_EPSILON; i++) {
        const category = categoryOf(queue[i].gloss)
        const score = (isSymbolLabel(queue[i].gloss, category) ? 0 : 2) + (usedCategories.has(category) ? 0 : 1)
        if (score > bestScore) { bestScore = score; choice = i }
      }
    }
    const [chosen] = queue.splice(choice, 1)
    picked.push(recommendationFor(chosen, now))
    if (categoryOf) usedCategories.add(categoryOf(chosen.gloss))
  }
  while (picked.length < limit && (reviews.length || unseen.length || other.length)) {
    for (let i = 0; i < REVIEWS_PER_NEW; i++) take(reviews)
    take(unseen, newOrder !== undefined)
    if (!reviews.length && !unseen.length) take(other)
  }
  return picked
}

export function buildSession(
  summaries: GlossMastery[], size = SESSION_SIZE, now: Date = new Date(),
  categoryOf?: (gloss: string) => string, newOrder?: readonly string[],
): string[] {
  return buildSessionPlan(summaries, size, now, categoryOf, newOrder).map((item) => item.gloss)
}

export function startSession(
  summaries: GlossMastery[],
  size: number = SESSION_SIZE,
  now: Date = new Date(),
  categoryOf?: (gloss: string) => string,
  newOrder?: readonly string[],
): PracticeSession {
  const recommendations = buildSessionPlan(summaries, size, now, categoryOf, newOrder)
  const glosses = recommendations.map((item) => item.gloss)
  const startMastery: Record<string, number> = {}
  for (const s of summaries) {
    if (glosses.includes(s.gloss)) startMastery[s.gloss] = s.mastery
  }
  return { id: crypto.randomUUID(), glosses, done: [], startedAt: now.toISOString(), startMastery, recommendations }
}

/** L-11's Path entry: approve curriculum first, load summaries, start/save this
 * session, then mount Practice on currentGloss(session). No UI ownership here. */
export function startUnitSession(
  unit: CurriculumUnit, summaries: GlossMastery[], now: Date = new Date(), size = UNIT_SESSION_SIZE,
): PracticeSession {
  if (unit.status !== 'approved') throw new Error('Unit needs curriculum approval before starting')
  if (!unit.signs.length || !Number.isInteger(size) || size < 1) throw new Error('Unit session needs signs and a positive size')
  const available = new Set(summaries.map((summary) => summary.gloss))
  if (!unit.signs.every((gloss) => available.has(gloss))) throw new Error('Unit references are not loaded')
  return { ...startSession(summaries, size, now, undefined, unit.signs), unitId: unit.id }
}

export function currentRecommendation(session: PracticeSession): PracticeRecommendation | null {
  const gloss = currentGloss(session)
  return session.recommendations?.find((item) => item.gloss === gloss) ?? null
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
    && (s.unitId === undefined || typeof s.unitId === 'string')
    && (s.recommendations === undefined || (Array.isArray(s.recommendations)
      && s.recommendations.every((item) => !!item && typeof item.gloss === 'string'
        && typeof item.reason === 'string' && ['new', 'review', 'practice'].includes(item.kind))))
  )
}
