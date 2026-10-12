import { LANDMARK_FINGER } from './landmarks'
import type { Finger } from './landmarks'
import type { HandScore } from './score'

/**
 * Per-finger feedback as a qualitative state (DN-17, kvn 13 Oct): Correct,
 * Almost or Wrong, from the deviation the scorer actually measured. No number
 * is ever shown next to a finger.
 *
 * NOT SHOWN IN THE UI (kvn, 13 Oct). Measured on the calibration corpus
 * (fingerStates.calibration.test.ts), no fixed cut-off on this deviation tells
 * a correct take from a wrong sign: with the cut-offs below 99.7% of fingers in
 * correct same-sign takes are Wrong, and cut-offs at the correct takes' own
 * p75/p90 mark a wrong sign's fingers Correct. Kept, tested, for L-17 to
 * revisit with a method that passes that check before anything is displayed.
 */
export type FingerState = 'correct' | 'almost' | 'wrong'

export const FINGER_STATE_LABEL: Record<FingerState, string> = {
  correct: 'Correct',
  almost: 'Almost',
  wrong: 'Wrong',
}

export type HandFinger = Exclude<Finger, 'wrist'>

export const HAND_FINGERS: HandFinger[] = ['thumb', 'index', 'middle', 'ring', 'pinky']

/** A finger is Wrong above `wrongAbove`, Almost above `almostAbove`, else Correct. */
export interface FingerCutoffs {
  wrongAbove: number
  almostAbove: number
}

/**
 * Cut-offs on a finger's worst joint deviation, in hand-size units.
 *
 * `wrongAbove` is the scorer's HINT_MIN_DEVIATION (score.ts), so a finger the
 * hints tell the learner to check is the finger shown as Wrong. `almostAbove`
 * is an UNTUNED UI constant: half the hint threshold, not fitted to any data.
 */
export const FINGER_CUTOFFS: FingerCutoffs = { wrongAbove: 0.1, almostAbove: 0.05 }

/**
 * A finger's deviation: the worst of its joints' average deviations along the
 * DTW alignment. The worst joint, not the mean, because the hints fire on a
 * single joint and the two must agree.
 */
export function fingerDeviation(perLandmark: readonly number[], finger: HandFinger): number {
  let worst = 0
  perLandmark.forEach((d, landmark) => {
    if (LANDMARK_FINGER[landmark] === finger && d > worst) worst = d
  })
  return worst
}

export function fingerState(deviation: number, cutoffs: FingerCutoffs = FINGER_CUTOFFS): FingerState {
  if (deviation > cutoffs.wrongAbove) return 'wrong'
  if (deviation > cutoffs.almostAbove) return 'almost'
  return 'correct'
}

export interface FingerReading {
  finger: HandFinger
  state: FingerState
}

/**
 * The state of each finger of one scored hand, thumb to little finger. Empty
 * when the hand was missing or nothing was measured: no data, no states.
 */
export function fingerStates(
  hand: Pick<HandScore, 'perLandmark' | 'missing'>,
  cutoffs: FingerCutoffs = FINGER_CUTOFFS,
): FingerReading[] {
  if (hand.missing || hand.perLandmark.length === 0) return []
  return HAND_FINGERS.map((finger) => ({
    finger,
    state: fingerState(fingerDeviation(hand.perLandmark, finger), cutoffs),
  }))
}
