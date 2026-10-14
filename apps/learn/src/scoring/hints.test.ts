import { describe, expect, it } from 'vitest'
import { buildHints, hintText } from './hints'
import type { Hint, HintInput } from './hints'

const input: HintInput = { score: 80, missingHands: [], handCount: 1, mirrored: false,
  attemptActiveMs: 2000, referenceMs: 2000, shapeContribution: 0.4, trajectoryContribution: 0.1 }
const hints = (patch: Partial<HintInput>) => buildHints({ ...input, ...patch })

describe('typed feedback rules', () => {
  it('only selects the close-match hint at 85 or above', () => {
    expect(hints({ score: 84 })).toEqual([{ kind: 'compare-reference' }])
    expect(hints({ score: 85 })).toEqual([{ kind: 'close-match' }])
    expect(hintText({ kind: 'compare-reference' })).toBe('Watch again, try again.')
  })
  it('timing limits are inclusive and ratios are rounded to one decimal', () => {
    expect(hints({ attemptActiveMs: 1340 })).toEqual([{ kind: 'compare-reference' }])
    expect(hints({ attemptActiveMs: 3000 })).toEqual([{ kind: 'compare-reference' }])
    expect(hints({ attemptActiveMs: 1339 })).toEqual([{ kind: 'timing', ratio: 0.7, direction: 'fast' }])
    expect(hints({ attemptActiveMs: 3130 })).toEqual([{ kind: 'timing', ratio: 1.6, direction: 'slow' }])
  })
  it('keeps timing direction from the unrounded ratio at both boundaries', () => {
    const fast = hints({ attemptActiveMs: 1339 })[0]
    const slow = hints({ attemptActiveMs: 3001 })[0]
    expect(slow).toEqual({ kind: 'timing', ratio: 1.5, direction: 'slow' })
    expect(hintText(fast)).toBe('Nice try! But little fast.')
    expect(hintText(slow)).toBe('Nice try! But little slow.')
  })
  it('does not guess timing for empty or invalid durations', () => {
    for (const patch of [{ attemptActiveMs: 0 }, { attemptActiveMs: -1 }, { referenceMs: 0 },
      { referenceMs: -1 }, { referenceMs: NaN }, { attemptActiveMs: Infinity }]) {
      expect(hints(patch)).toEqual([{ kind: 'compare-reference' }])
    }
  })
  it('emits path only for a finite positive dominant weighted trajectory cost', () => {
    expect(hints({ trajectoryContribution: 0.5 })).toEqual([{ kind: 'path' }])
    for (const patch of [{ trajectoryContribution: 0.4 }, { trajectoryContribution: Infinity },
      { shapeContribution: NaN }, { shapeContribution: 0, trajectoryContribution: 0 }]) {
      expect(hints(patch)).toEqual([{ kind: 'compare-reference' }])
    }
  })
  it('names the learner hand when mirrored', () => {
    expect(hints({ handCount: 2, missingHands: ['Left'], mirrored: true }))
      .toEqual([{ kind: 'missing-hand', hand: 'Right' }])
    expect(hints({ handCount: 2, missingHands: ['Right'], mirrored: true }))
      .toEqual([{ kind: 'missing-hand', hand: 'Left' }])
    expect(hints({ handCount: 2, missingHands: ['Left'] }))
      .toEqual([{ kind: 'missing-hand', hand: 'Left' }])
  })
  it('uses one structural hint for both absent hands; caps the ordered list at two', () => {
    expect(hints({ handCount: 2, missingHands: ['Left', 'Right'] }))
      .toEqual([{ kind: 'missing-hand', hand: 'both' }])
    expect(hints({ missingHands: ['Right'], trajectoryContribution: 0.8, attemptActiveMs: 4000 }))
      .toEqual([{ kind: 'untracked-attempt' }, { kind: 'path' }])
  })
  it('keeps a time hint after path', () => {
    expect(hints({ trajectoryContribution: 0.5, attemptActiveMs: 4000 }))
      .toEqual([{ kind: 'path' }, { kind: 'timing', ratio: 2, direction: 'slow' }])
  })
})

describe('kvn-approved plain hint text', () => {
  it.each<[Hint, boolean, string]>([
    [{ kind: 'close-match' }, false, 'Great job! That looks correct.'],
    [{ kind: 'close-match' }, true, 'Great job! Both hands look correct.'],
    [{ kind: 'path' }, false, 'Your hand moved another way, do it again!'],
    [{ kind: 'timing', ratio: 2, direction: 'slow' }, false, 'Nice try! But little slow.'],
    [{ kind: 'timing', ratio: 0.5, direction: 'fast' }, false, 'Nice try! But little fast.'],
    [{ kind: 'missing-hand', hand: 'Left' }, true, 'Use your other hand too.'],
    [{ kind: 'missing-hand', hand: 'Right' }, true, 'Use your other hand too.'],
    [{ kind: 'missing-hand', hand: 'both' }, true, 'Please use your hands.'],
    [{ kind: 'untracked-attempt' }, false, 'Show your hands, turn the lights on!'],
    [{ kind: 'untracked-reference' }, false, 'Oops, this sign is not ready yet.'],
    [{ kind: 'compare-reference' }, false, 'Watch again, try again.'],
  ])('formats %j (twoHanded=%s) exactly', (hint, twoHanded, expected) => {
    expect(hintText(hint, twoHanded)).toBe(expected)
  })
})
