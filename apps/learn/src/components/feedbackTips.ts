import type { Hint } from '../scoring/hints'
/** These describe measured tracking/match differences, never SSL correctness. */
export function feedbackTip(hint: Hint): string {
  switch (hint.kind) {
    case 'missing-hand': return hint.hand === 'both' ? 'Show both hands in the camera.' : `We could not see your ${hint.hand.toLowerCase()} hand.`
    case 'untracked-attempt': return 'We could not see your hands. Try more light.'
    case 'untracked-reference': return 'This reference is not ready yet.'
    case 'path': return 'Your hand path differed. Watch the replay.'
    case 'timing': return hint.direction === 'slow' ? 'Try a little faster.' : 'Try a little slower.'
    case 'close-match': return 'Close match to the reference.'
    default: return 'Watch the replay, then try again.'
  }
}
