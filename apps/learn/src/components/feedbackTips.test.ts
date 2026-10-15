import { expect, it } from 'vitest'
import { feedbackTip } from './feedbackTips'
it('turns typed match observations into plain advice without correctness claims', () => {
  expect(feedbackTip({ kind: 'missing-hand', hand: 'Left' })).toBe('We could not see your left hand.')
  expect(feedbackTip({ kind: 'timing', direction: 'slow', ratio: 2 })).toBe('Try a little faster.')
  expect(feedbackTip({ kind: 'timing', direction: 'fast', ratio: 0.5 })).toBe('Try a little slower.')
  expect(feedbackTip({ kind: 'close-match' })).toBe('Close match to the reference.')
})
