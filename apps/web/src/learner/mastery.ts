import type { AttemptLogEntry } from './attemptLog'

// Learner model v1 — a deliberately simple, explainable heuristic. It will be
// replaced by BKT + RL-driven curriculum in the final phase (Sep–Oct); the
// attempt log it reads from stays the same, so that swap is contained here.

// Recency-weighted average: each new attempt counts for half the estimate.
// A high alpha matters with short histories — it guarantees that improving
// over time ([0,100,100]) scores higher than declining ([100,100,0]).
const EWMA_ALPHA = 0.5

// "Mastered" needs consistency, not one lucky attempt.
const MASTERED_MIN_ATTEMPTS = 3
const MASTERED_THRESHOLD = 0.85
const IMPROVING_THRESHOLD = 0.6

// practice-need blend: how weak the sign is vs. how long since it was drilled.
const W_WEAKNESS = 0.75
const W_STALENESS = 0.25
const STALENESS_FULL_DAYS = 5

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
 * maximum need (introduce new vocabulary first — breadth before depth);
 * attempted ones blend weakness with staleness so mastered signs resurface
 * for revision after a few days.
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

/** The gloss to practise next (highest need, ties alphabetical), or null. */
export function suggestNext(summaries: GlossMastery[], now: Date = new Date()): string | null {
  if (summaries.length === 0) return null
  const ranked = [...summaries].sort(
    (a, b) => practiceNeed(b, now) - practiceNeed(a, now) || a.gloss.localeCompare(b.gloss),
  )
  return ranked[0].gloss
}
