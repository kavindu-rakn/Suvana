export type Hint =
  | { kind: 'missing-hand'; hand: 'Left' | 'Right' | 'both' }
  | { kind: 'untracked-attempt' | 'untracked-reference' | 'path' | 'close-match' | 'compare-reference' }
  | { kind: 'timing'; ratio: number }

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
    hints.push({ kind: 'timing', ratio: Math.round(ratio * 10) / 10 })
  }
  if (!hints.length) hints.push({ kind: input.score >= CLOSE_MATCH_SCORE ? 'close-match' : 'compare-reference' })
  return hints.slice(0, 2)
}

/** Compatibility text for the current UI. L-21 can consume typed hints directly. */
export function hintText(hint: Hint, twoHanded = false): string {
  switch (hint.kind) {
    case 'missing-hand': return hint.hand === 'both'
      ? 'This sign is two-handed — use both hands.'
      : `Use your ${hint.hand.toLowerCase()} hand too — this sign is two-handed.`
    case 'untracked-attempt': return 'No hand was tracked in your attempt — check your framing and lighting.'
    case 'untracked-reference': return 'No hands were tracked in the reference.'
    case 'path': return 'Your hand path differs from the reference — watch the movement at 0.5x.'
    case 'timing': return `Your active signing duration was ${hint.ratio.toFixed(1)}x the reference — compare the pace at 0.5x.`
    case 'close-match': return twoHanded
      ? 'Close match — both hands are tracking the reference well.'
      : 'Close match — keep the same handshape and pace.'
    case 'compare-reference': return 'Compare your attempt with the reference at 0.5x, then try again.'
  }
}
