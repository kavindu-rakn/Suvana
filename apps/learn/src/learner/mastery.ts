import type { AttemptLogEntry } from './attemptLog'
import { isSentenceGloss } from '../data/sentences'

// Rule-based by design. BKT/learned adaptation needs real learner data and
// teacher judgments first; no learned model or learning gains are claimed.

// Recency-weighted average: each new attempt counts for half the estimate.
// A high alpha matters with short histories — it guarantees that improving
// over time ([0,100,100]) scores higher than declining ([100,100,0]).
export const EWMA_ALPHA = 0.5

// "Mastered" needs consistency, not one lucky attempt.
export const MASTERED_MIN_ATTEMPTS = 3
export const MASTERED_THRESHOLD = 0.85
export const IMPROVING_THRESHOLD = 0.6

// practice-need blend: how weak the sign is vs. how long since it was drilled.
export const W_WEAKNESS = 0.75
export const W_STALENESS = 0.25
export const STALENESS_FULL_DAYS = 5
// Untuned scheduling threshold; it is not a correctness/accuracy boundary.
export const DUE_REVIEW_THRESHOLD = 0.5

export type MasteryLevel = 'new' | 'learning' | 'improving' | 'mastered'

export interface GlossMastery {
  gloss: string
  attempts: number
  /** Recency-weighted score estimate, 0–1. 0 when never attempted. */
  mastery: number
  lastScore: number | null
  lastPracticedAt: string | null
  /** Up to the last 8 scores, oldest → newest (for trend display). */
  recentScores: number[]
  level: MasteryLevel
}

export function summarizeGloss(gloss: string, entries: AttemptLogEntry[]): GlossMastery {
  const own = entries
    .filter((e) => e.gloss === gloss)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  if (own.length === 0) {
    return {
      gloss,
      attempts: 0,
      mastery: 0,
      lastScore: null,
      lastPracticedAt: null,
      recentScores: [],
      level: 'new',
    }
  }

  let mastery = own[0].score / 100
  for (let i = 1; i < own.length; i++) {
    mastery += EWMA_ALPHA * (own[i].score / 100 - mastery)
  }

  const last = own[own.length - 1]
  const level: MasteryLevel =
    mastery >= MASTERED_THRESHOLD && own.length >= MASTERED_MIN_ATTEMPTS
      ? 'mastered'
      : mastery >= IMPROVING_THRESHOLD
        ? 'improving'
        : 'learning'

  return {
    gloss,
    attempts: own.length,
    mastery,
    lastScore: last.score,
    lastPracticedAt: last.createdAt,
    recentScores: own.slice(-8).map((e) => e.score),
    level,
  }
}

/** Summaries for every gloss in the vocabulary (attempted or not), sorted by gloss. */
export function summarizeAll(glosses: string[], entries: AttemptLogEntry[]): GlossMastery[] {
  return [...new Set(glosses)].sort().map((g) => summarizeGloss(g, entries))
}

/**
 * How much a sign wants practice right now, 0–1. Never-attempted signs get
 * maximum numeric need, but selection explicitly partitions due reviews first.
 * Attempted signs blend weakness with staleness so they can resurface later.
 */
export function practiceNeed(summary: GlossMastery, now: Date): number {
  if (summary.attempts === 0) return 1
  const days = Math.max(
    0,
    (now.getTime() - new Date(summary.lastPracticedAt!).getTime()) / 86_400_000,
  )
  const staleness = Math.min(days / STALENESS_FULL_DAYS, 1)
  return (1 - summary.mastery) * W_WEAKNESS + staleness * W_STALENESS
}

export interface PracticeRecommendation {
  gloss: string
  kind: 'review' | 'new' | 'practice'
  reason: string
}

export function isDueReview(summary: GlossMastery, now: Date): boolean {
  return summary.attempts > 0 && practiceNeed(summary, now) > DUE_REVIEW_THRESHOLD
}

/** Explain the actual selection rule without calling a first low score a drop. */
export function recommendationFor(summary: GlossMastery, now: Date): PracticeRecommendation {
  if (summary.attempts === 0) return { gloss: summary.gloss, kind: 'new', reason: 'new: next in unit' }
  if (!isDueReview(summary, now)) return { gloss: summary.gloss, kind: 'practice', reason: 'practice: refresh this sign' }
  const scores = summary.recentScores
  if (scores.length >= 2 && scores[scores.length - 1] < scores[scores.length - 2]) {
    return { gloss: summary.gloss, kind: 'review', reason: 'review: score dropped' }
  }
  const days = Math.max(0, Math.floor((now.getTime() - new Date(summary.lastPracticedAt!).getTime()) / 86_400_000))
  return { gloss: summary.gloss, kind: 'review', reason: days >= 1
    ? `review: not practised for ${days} days` : 'review: low match score' }
}

/** Strict policy for a single Next: due review, then a new sign in unit order,
 * then the highest-need already-attempted sign. No mutation of summaries. */
export function recommendNext(
  summaries: readonly GlossMastery[], now: Date = new Date(), newOrder?: readonly string[],
): PracticeRecommendation | null {
  summaries = summaries.filter(summary => !isSentenceGloss(summary.gloss))
  const rank = (a: GlossMastery, b: GlossMastery) =>
    practiceNeed(b, now) - practiceNeed(a, now) || a.gloss.localeCompare(b.gloss)
  const due = summaries.filter((summary) => isDueReview(summary, now)).sort(rank)
  if (due.length) return recommendationFor(due[0], now)
  const unseen = summaries.filter((summary) => summary.attempts === 0
    && (newOrder === undefined || newOrder.includes(summary.gloss)))
    .sort((a, b) => newOrder === undefined ? a.gloss.localeCompare(b.gloss)
      : newOrder.indexOf(a.gloss) - newOrder.indexOf(b.gloss))
  if (unseen.length) return recommendationFor(unseen[0], now)
  const attempted = summaries.filter((summary) => summary.attempts > 0
    && (newOrder === undefined || newOrder.includes(summary.gloss))).sort(rank)
  return attempted.length ? recommendationFor(attempted[0], now) : null
}

/** Backwards-compatible gloss API; existing Practice now benefits from due-first selection. */
export function suggestNext(summaries: GlossMastery[], now: Date = new Date()): string | null {
  return recommendNext(summaries, now)?.gloss ?? null
}
