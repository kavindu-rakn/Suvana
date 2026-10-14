export type Hint =
  | { kind: 'missing-hand'; hand: 'Left' | 'Right' | 'both' }
  | { kind: 'untracked-attempt' | 'untracked-reference' | 'path' | 'close-match' | 'compare-reference' }
  | { kind: 'timing'; ratio: number; direction: 'slow' | 'fast' }

export interface HintInput {
  score: number
  missingHands: Array<'Left' | 'Right'>
  handCount: number
  mirrored: boolean
  attemptActiveMs: number
  referenceMs: number
  shapeContribution: number
  trajectoryContribution: number
}

// Untuned feedback/UI constants, not claims of sign correctness.
export const TIMING_MIN_RATIO = 0.67
export const TIMING_MAX_RATIO = 1.5
export const CLOSE_MATCH_SCORE = 85

/** Structural absence first, then dominant distance contribution, then time.
 * Per-finger corrections remain disabled: calibration distributions overlap.
 */
export function buildHints(input: HintInput): Hint[] {
  const hints: Hint[] = []
  if (input.missingHands.length) {
    if (input.handCount < 2) hints.push({ kind: 'untracked-attempt' })
    else {
      const hand = input.missingHands[0]
      hints.push({ kind: 'missing-hand', hand: input.missingHands.length >= input.handCount
        ? 'both' : input.mirrored ? (hand === 'Left' ? 'Right' : 'Left') : hand })
    }
  }
  if (Number.isFinite(input.trajectoryContribution) && Number.isFinite(input.shapeContribution)
      && input.trajectoryContribution > input.shapeContribution && input.trajectoryContribution > 0) {
    hints.push({ kind: 'path' })
  }
  const ratio = input.attemptActiveMs / input.referenceMs
  if (input.attemptActiveMs > 0 && input.referenceMs > 0 && Number.isFinite(ratio)
      && (ratio < TIMING_MIN_RATIO || ratio > TIMING_MAX_RATIO)) {
    hints.push({ kind: 'timing', ratio: Math.round(ratio * 10) / 10,
      direction: ratio > TIMING_MAX_RATIO ? 'slow' : 'fast' })
  }
  if (!hints.length) hints.push({ kind: input.score >= CLOSE_MATCH_SCORE ? 'close-match' : 'compare-reference' })
  return hints.slice(0, 2)
}

/** Compatibility text for the current UI. L-21 can consume typed hints directly. */
export function hintText(hint: Hint, twoHanded = false): string {
  switch (hint.kind) {
    case 'missing-hand': return hint.hand === 'both'
      ? 'Please use your hands.'
      : 'Use your other hand too.'
    case 'untracked-attempt': return 'Show your hands, turn the lights on!'
    case 'untracked-reference': return 'Oops, this sign is not ready yet.'
    case 'path': return 'Your hand moved another way, do it again!'
    case 'timing': return hint.direction === 'slow'
      ? 'Nice try! But little slow.'
      : 'Nice try! But little fast.'
    case 'close-match': return twoHanded
      ? 'Great job! Both hands look correct.'
      : 'Great job! That looks correct.'
    default: return 'Watch again, try again.'
  }
}
