import type { SignRecording } from '../vision/types'
import { scoreAttempt } from '../scoring/score'
import type { ScoreResult } from '../scoring/score'

/**
 * Scenario turn scoring.
 *
 * The proposal's rubric is accuracy 40% / appropriateness 30% /
 * fluency-timing 20% / non-manual markers 10%. **We capture hand landmarks
 * only, so non-manual markers (facial expression, head and body movement)
 * cannot be measured at all.** Rather than invent a number for them, that 10%
 * is folded into accuracy — the component our data actually supports.
 *
 * Documented deviation, surfaced in the scenario summary UI so it is visible
 * to a reader/examiner rather than buried here.
 */
export const RUBRIC_WEIGHTS = {
  accuracy: 0.5, // proposal 40% + the 10% reallocated from non-manual markers
  appropriateness: 0.3,
  fluency: 0.2,
} as const

export type RubricComponent = keyof typeof RUBRIC_WEIGHTS

export const RUBRIC_LABEL: Record<RubricComponent, string> = {
  accuracy: 'Accuracy',
  appropriateness: 'Appropriateness',
  fluency: 'Fluency & timing',
}

/** What each component actually measures — shown in the UI, not just in code. */
export const RUBRIC_BASIS: Record<RubricComponent, string> = {
  accuracy: 'DTW match against the reference recording of this sign.',
  appropriateness:
    'Whether this attempt matches the requested sign better than the other signs in the library — i.e. did you sign the right thing for this moment.',
  fluency: 'How close your pace was to the reference (DTW ignores speed, so it is scored here).',
}

// Fluency: symmetric in log space, so signing twice too fast and twice too slow
// are penalised equally. Full marks within ±25% of reference pace, zero at 2.5×.
const FLUENCY_TOLERANCE = Math.log(1.25)
const FLUENCY_ZERO = Math.log(2.5)

// Appropriateness: how far the target must beat the best competing gloss to earn
// full marks. A tie scores 50 — genuinely ambiguous, so neither pass nor fail.
// PROVISIONAL, like the DTW score anchors — needs calibration against real data.
const APPROPRIATENESS_MARGIN = 15

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

/**
 * Pace score, or null when it cannot be computed (a take with no duration).
 * Null means "not measured" — never silently 0, which would be a real penalty.
 */
export function fluencyScore(attemptMs: number, referenceMs: number): number | null {
  if (!(attemptMs > 0) || !(referenceMs > 0)) return null
  const deviation = Math.abs(Math.log(attemptMs / referenceMs))
  if (deviation <= FLUENCY_TOLERANCE) return 100
  if (deviation >= FLUENCY_ZERO) return 0
  return Math.round(
    100 * (1 - (deviation - FLUENCY_TOLERANCE) / (FLUENCY_ZERO - FLUENCY_TOLERANCE)),
  )
}

/**
 * How clearly the attempt matched the requested sign rather than some other
 * sign in the library. `bestOtherScore` is the highest score the same attempt
 * earned against a *different* gloss.
 */
export function appropriatenessScore(targetScore: number, bestOtherScore: number): number {
  const margin = targetScore - bestOtherScore
  return Math.round(clamp(50 + (50 * margin) / APPROPRIATENESS_MARGIN, 0, 100))
}

export interface RubricParts {
  accuracy: number
  appropriateness: number | null
  fluency: number | null
}

export interface RubricBreakdown extends RubricParts {
  /** Weighted total over the components that could be measured. */
  total: number
  /** Components with no data — reported to the learner rather than scored as 0. */
  unmeasured: RubricComponent[]
  /** Effective weights after redistributing any unmeasured component. */
  effectiveWeights: Record<RubricComponent, number>
}

/**
 * Combine the components, redistributing the weight of anything unmeasurable
 * across the rest. A component we cannot measure must not quietly cost marks.
 */
export function combineRubric(parts: RubricParts): RubricBreakdown {
  const measured = (Object.keys(RUBRIC_WEIGHTS) as RubricComponent[]).filter(
    (k) => parts[k] !== null,
  )
  const unmeasured = (Object.keys(RUBRIC_WEIGHTS) as RubricComponent[]).filter(
    (k) => parts[k] === null,
  )
  const available = measured.reduce((sum, k) => sum + RUBRIC_WEIGHTS[k], 0)

  const effectiveWeights = { accuracy: 0, appropriateness: 0, fluency: 0 }
  let total = 0
  for (const k of measured) {
    const w = RUBRIC_WEIGHTS[k] / available
    effectiveWeights[k] = w
    total += (parts[k] as number) * w
  }

  return { ...parts, total: Math.round(total), unmeasured, effectiveWeights }
}

export interface TurnScore {
  rubric: RubricBreakdown
  /** Full DTW result against the target reference — drives the hint text. */
  detail: ScoreResult
  /** Gloss that matched best overall; differs from the target on a wrong sign. */
  bestMatchGloss: string
}

/**
 * Score one scenario turn.
 *
 * `otherReferences` should be the *scenario's own vocabulary*, not the whole
 * library. Two reasons:
 *  - Meaning: "did you sign YOU when asked for ME" is the confusion worth
 *    reporting; whether the attempt resembles an unrelated verb is noise.
 *  - Cost: appropriateness runs one DTW alignment per competitor. Against the
 *    full library that grows without bound as vocabulary grows (~490 ms at 80
 *    references); against a scenario's handful of signs it stays small.
 */
export function scoreTurn(
  attempt: SignRecording,
  targetReference: SignRecording,
  otherReferences: SignRecording[],
): TurnScore {
  const detail = scoreAttempt(attempt, targetReference)

  const competitors = otherReferences.filter((r) => r.gloss !== targetReference.gloss)
  let bestOther: { gloss: string; score: number } | null = null
  for (const ref of competitors) {
    const score = scoreAttempt(attempt, ref).score
    if (!bestOther || score > bestOther.score) bestOther = { gloss: ref.gloss, score }
  }

  // With nothing to compare against, appropriateness is genuinely unmeasurable.
  const appropriateness = bestOther ? appropriatenessScore(detail.score, bestOther.score) : null

  const rubric = combineRubric({
    accuracy: detail.score,
    appropriateness,
    fluency: fluencyScore(attempt.durationMs, targetReference.durationMs),
  })

  const bestMatchGloss =
    bestOther && bestOther.score > detail.score ? bestOther.gloss : targetReference.gloss

  return { rubric, detail, bestMatchGloss }
}
