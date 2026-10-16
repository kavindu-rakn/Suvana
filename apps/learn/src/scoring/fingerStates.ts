import { LANDMARK_FINGER } from './landmarks'
import type { Finger } from './landmarks'
import type { HandScore } from './score'
import type { SignRecording } from '../vision/types'
import { SIGN_FINGER_CUTOFFS } from './fingerCutoffs'

/**
 * Per-finger feedback as a qualitative state (DN-17, kvn 13 Oct): Correct,
 * Almost or Wrong, from the deviation the scorer actually measured. No number
 * is ever shown next to a finger.
 *
 * The legacy global cut-offs below are NOT SHOWN IN THE UI (kvn, 13 Oct).
 * L-33 uses calibratedFingerStates with a reference-specific table instead.
 * Measured on the calibration corpus
 * (fingerStates.calibration.test.ts), no fixed cut-off on this deviation tells
 * a correct take from a wrong sign: with the cut-offs below 99.7% of fingers in
 * correct same-sign takes are Wrong, and cut-offs at the correct takes' own
 * p75/p90 mark a wrong sign's fingers Correct. Kept for historical tests;
 * the runtime never falls back to them for an unsupported reference.
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

/** L-33: no global fallback. Only a calibrated, unchanged corpus reference
 * gets states. Table provenance tests pin the shipped reference bytes and scorer.
 * Missing/incomplete/non-finite measurements never imply Correct. */
export function calibratedFingerStates(
  hand: Pick<HandScore, 'perLandmark' | 'missing'>,
  reference: Pick<SignRecording, 'id' | 'gloss' | 'source' | 'provisional'>,
): FingerReading[] {
  if (reference.provisional || !Object.hasOwn(SIGN_FINGER_CUTOFFS, reference.id)) return []
  const fit = SIGN_FINGER_CUTOFFS[reference.id]
  if (fit.gloss !== reference.gloss || fit.source !== reference.source || hand.missing ||
      hand.perLandmark.length !== 21 || hand.perLandmark.some((v) => !Number.isFinite(v) || v < 0)) return []
  return HAND_FINGERS.map((finger, i) => ({ finger,
    state: fingerState(fingerDeviation(hand.perLandmark, finger), {
      wrongAbove: fit.wrong[i], almostAbove: fit.almost[i],
    }),
  }))
}
