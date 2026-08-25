import type { SignRecording } from '../vision/types'
import { dtw } from './dtw'
import { extractHandFeatures, handednessesIn, mirrorHandFeatures } from './normalize'
import type { FrameFeature, HandFeatureSequence } from './normalize'
import { FINGER_LABEL, LANDMARK_FINGER, NUM_LANDMARKS } from './landmarks'
import type { Finger } from './landmarks'

// --- tunables -------------------------------------------------------------
// Relative contribution of handshape vs. movement to the per-frame distance,
// constrained to sum to 1 so the distance scale — and the anchors below — stay
// comparable across weightings.
//
// Fitted by grid search over the calibration corpus (weights.fit.test.ts →
// weight-fit-report.md). Separation rises monotonically with W_SHAPE, peaking at
// 78.6% for W_SHAPE = 1.0, i.e. discarding movement entirely.
//
// We deliberately do NOT take that maximum. The search optimises "is this the
// same sign?", a classification objective; this scorer's job is to *grade a
// known sign*, and movement is a phonological parameter of SSL. A learner with
// the correct handshape and the wrong movement has made an error worth
// reporting, and a scorer blind to it would grade them as perfect. 0.8/0.2 keeps
// movement in scope while taking the measured gain (73.5% → 74.3%).
const W_SHAPE = 0.8
const W_TRAJ = 0.2

/** Weighting of the two feature blocks in the per-frame distance. */
export interface DistanceWeights {
  shape: number
  traj: number
}

export const DEFAULT_WEIGHTS: DistanceWeights = { shape: W_SHAPE, traj: W_TRAJ }

// Map the average per-frame distance `d` (in hand-size units) to a 0–100 score
// between two linear anchors: d ≤ D_PERFECT scores 100, d ≥ D_ZERO scores 0.
//
// Derived from measured data, not guessed. Across 557 takes of 33 signs by one
// fluent signer, two takes of the *same* sign sit at distance p10 0.222,
// median 0.459, p90 0.767 (src/scoring/calibration.test.ts →
// calibration-report.md). The anchors are set to that p10/p90, so the best
// tenth of correct renditions score 100, a typical one lands mid-scale, and the
// worst tenth score 0. Re-derive these whenever the feature or weights change:
// they are expressed in distance units, which those changes move.
//
// The previous values (0.05 / 0.35) predated any data and were far too tight:
// D_ZERO sat *below* the median correct rendition, so a genuinely correct
// attempt scored 0.
//
// KNOWN LIMIT — this scale grades *how well a known target sign was performed*.
// It is not a sign classifier. Measured cross-sign distances start at 0.134
// (30 vs 40), i.e. some distinct signs are closer together than two takes of
// one sign typically are, so a high score is not proof the right sign was made.
// That is why appropriateness (rubric.ts) compares only within a scenario's
// small vocabulary rather than all 351 references.
//
// Still to do: every calibration take is by one fluent signer, so this captures
// natural variation of a *correct* rendition, not a learner's wider spread.
// Re-fit against real learner attempts graded by an SSL teacher before quoting
// the ≥90%-accuracy figure.
export const D_PERFECT = 0.22
export const D_ZERO = 0.77

// A hand the reference expects but the learner never showed: heavy penalty.
const MISSING_HAND_SCORE = 0

// A finger is only worth a corrective hint if its average deviation (in
// hand-size units) exceeds this — otherwise a near-perfect attempt would still
// be told to "fix" fingers that are essentially correct.
const HINT_MIN_DEVIATION = 0.1

export interface JointDeviation {
  landmark: number
  finger: Finger
  /** Average positional deviation at this joint, in hand-size units. */
  deviation: number
}

export interface HandScore {
  handedness: 'Left' | 'Right'
  score: number
  normalizedDistance: number
  /** Per-landmark average deviation along the alignment (length 21). */
  perLandmark: number[]
  /** True if the reference used this hand but the attempt never showed it. */
  missing: boolean
}

export interface ScoreResult {
  /** Overall 0–100, frame-weighted average of the per-hand scores. */
  score: number
  /**
   * Weighted mean DTW distance behind that score, in hand-size units, before
   * the 0–100 mapping. The score saturates at both ends by design; this does
   * not, so it is what threshold calibration has to work from.
   */
  normalizedDistance: number
  hands: HandScore[]
  /** Worst joints across all hands, most deviant first — feeds feedback text. */
  worstJoints: JointDeviation[]
  /** Human-readable corrective hints, most important first. */
  hints: string[]
  /** True when the learner signed mirrored (e.g. left-dominant) and we scored
   *  them against the reflected reference. */
  mirrored: boolean
  /** True if the reference itself uses both hands. */
  twoHanded: boolean
}

/** The distinct fingers most in need of correction, worst first. */
export function topFingers(result: ScoreResult, limit = 3): Finger[] {
  const seen: Finger[] = []
  for (const j of result.worstJoints) {
    if (j.finger === 'wrist') continue
    if (!seen.includes(j.finger)) seen.push(j.finger)
    if (seen.length === limit) break
  }
  return seen
}

/** Root-mean-square distance between two equal-length vectors. */
function rms(a: number[], b: number[]): number {
  let sum = 0
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i]
    sum += d * d
  }
  return Math.sqrt(sum / a.length)
}

/** Per-frame distance = weighted RMS of the shape block + the trajectory block. */
function frameDistance(a: FrameFeature, b: FrameFeature, w: DistanceWeights): number {
  return w.shape * rms(a.shape, b.shape) + w.traj * rms(a.traj, b.traj)
}

function distanceToScore(d: number): number {
  if (d <= D_PERFECT) return 100
  if (d >= D_ZERO) return 0
  return Math.round((1 - (d - D_PERFECT) / (D_ZERO - D_PERFECT)) * 100)
}

/** Per-landmark deviation (shape block only) averaged over the alignment path. */
function perLandmarkDeviation(
  attempt: FrameFeature[],
  reference: FrameFeature[],
  path: Array<[number, number]>,
): number[] {
  const totals = new Array(NUM_LANDMARKS).fill(0)
  for (const [ai, ri] of path) {
    const sa = attempt[ai].shape
    const sr = reference[ri].shape
    for (let k = 0; k < NUM_LANDMARKS; k++) {
      const dx = sa[k * 3] - sr[k * 3]
      const dy = sa[k * 3 + 1] - sr[k * 3 + 1]
      const dz = sa[k * 3 + 2] - sr[k * 3 + 2]
      totals[k] += Math.hypot(dx, dy, dz)
    }
  }
  return totals.map((t) => t / Math.max(path.length, 1))
}

function scoreHand(
  attempt: HandFeatureSequence,
  reference: HandFeatureSequence,
  w: DistanceWeights,
): HandScore {
  if (attempt.frames.length === 0) {
    return {
      handedness: reference.handedness,
      score: MISSING_HAND_SCORE,
      normalizedDistance: Infinity,
      perLandmark: new Array(NUM_LANDMARKS).fill(Infinity),
      missing: true,
    }
  }
  const result = dtw(attempt.frames.length, reference.frames.length, (i, j) =>
    frameDistance(attempt.frames[i], reference.frames[j], w),
  )
  return {
    handedness: reference.handedness,
    score: distanceToScore(result.normalizedDistance),
    normalizedDistance: result.normalizedDistance,
    perLandmark: perLandmarkDeviation(attempt.frames, reference.frames, result.path),
    missing: false,
  }
}

function buildHints(
  hands: HandScore[],
  worstJoints: JointDeviation[],
  twoHanded: boolean,
): string[] {
  const hints: string[] = []

  for (const hand of hands) {
    if (!hand.missing) continue
    hints.push(
      twoHanded
        ? `Use your ${hand.handedness.toLowerCase()} hand too — this sign is two-handed.`
        : 'No hand was tracked in your attempt — check your framing and lighting.',
    )
  }

  // Group the worst joints by finger so we don't repeat "index finger" 4 times,
  // and only mention fingers that are meaningfully off.
  const byFinger = new Map<string, JointDeviation>()
  for (const j of worstJoints) {
    if (j.finger === 'wrist' || j.deviation <= HINT_MIN_DEVIATION) continue
    if (!byFinger.has(j.finger)) byFinger.set(j.finger, j)
  }
  for (const dev of [...byFinger.values()].slice(0, 2)) {
    hints.push(`Check your ${FINGER_LABEL[dev.finger]} — its shape drifts from the reference.`)
  }

  if (hints.length === 0) {
    hints.push(
      twoHanded
        ? 'Close match — both hands are tracking the reference well.'
        : 'Close match — keep the same handshape and pace.',
    )
  }
  return hints
}

/** Score every reference hand against the attempt hand of the same handedness. */
function evaluate(
  refSeqs: HandFeatureSequence[],
  attemptSeqs: HandFeatureSequence[],
  w: DistanceWeights,
): { hands: HandScore[]; score: number } {
  const hands = refSeqs.map((ref) => {
    const att = attemptSeqs.find((a) => a.handedness === ref.handedness)
    return scoreHand(att ?? { handedness: ref.handedness, frames: [] }, ref, w)
  })

  // Weight each hand by how many reference frames it appears in, so the
  // dominant hand of the sign counts for more.
  const weights = refSeqs.map((r) => Math.max(r.frames.length, 1))
  const totalWeight = weights.reduce((a, b) => a + b, 0)
  const score = Math.round(
    hands.reduce((acc, h, i) => acc + h.score * weights[i], 0) / totalWeight,
  )
  return { hands, score }
}

/**
 * Score a practice attempt against a reference recording of the same sign.
 * Both are run through the identical normalisation pipeline (each with its own
 * capture resolution), then aligned per hand with DTW.
 *
 * The attempt is scored twice — as performed, and mirrored — and the better of
 * the two wins. Sign languages let the signer pick their dominant hand, so a
 * left-dominant learner performing a right-handed reference is correct, not
 * wrong, and must not be scored as a missing hand.
 */
export function scoreAttempt(
  attempt: SignRecording,
  reference: SignRecording,
  weights: DistanceWeights = DEFAULT_WEIGHTS,
): ScoreResult {
  const refSeqs = handednessesIn(reference.frames)
    .map((h) =>
      extractHandFeatures(reference.frames, h, reference.videoWidth, reference.videoHeight),
    )
    .filter((s) => s.frames.length > 0) // reference may label a hand it never really tracked

  if (refSeqs.length === 0) {
    return {
      score: 0,
      normalizedDistance: Infinity,
      hands: [],
      worstJoints: [],
      hints: ['No hands were tracked in the reference.'],
      mirrored: false,
      twoHanded: false,
    }
  }
  const twoHanded = refSeqs.length > 1

  const attemptSeqs = (['Left', 'Right'] as const).map((h) =>
    extractHandFeatures(attempt.frames, h, attempt.videoWidth, attempt.videoHeight),
  )
  const direct = evaluate(refSeqs, attemptSeqs, weights)
  const flipped = evaluate(refSeqs, attemptSeqs.map(mirrorHandFeatures), weights)

  const mirrored = flipped.score > direct.score
  const { hands, score } = mirrored ? flipped : direct

  // Collect per-joint deviations across the hands we actually scored, worst first.
  const worstJoints: JointDeviation[] = []
  for (const hand of hands) {
    if (hand.missing) continue
    hand.perLandmark.forEach((deviation, landmark) => {
      worstJoints.push({ landmark, finger: LANDMARK_FINGER[landmark], deviation })
    })
  }
  worstJoints.sort((a, b) => b.deviation - a.deviation)

  // Same weighting as the score, but over the raw distances, so calibration can
  // see past the 0–100 saturation.
  const distanceWeights = hands.map((h) => (h.missing ? 0 : 1))
  const distanceTotal = distanceWeights.reduce((a: number, b: number) => a + b, 0)
  const normalizedDistance =
    distanceTotal === 0
      ? Infinity
      : hands.reduce((acc, h, i) => acc + (h.missing ? 0 : h.normalizedDistance) * distanceWeights[i], 0) /
        distanceTotal

  return {
    score,
    normalizedDistance,
    hands,
    worstJoints,
    hints: buildHints(hands, worstJoints, twoHanded),
    mirrored,
    twoHanded,
  }
}
