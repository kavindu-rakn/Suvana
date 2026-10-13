import { describe, expect, it } from 'vitest'
import { buildHints, hintText } from './hints'
import type { HintInput } from './hints'

const input: HintInput = { score: 80, missingHands: [], handCount: 1, mirrored: false,
  attemptActiveMs: 2000, referenceMs: 2000, shapeContribution: 0.4, trajectoryContribution: 0.1 }
const hints = (patch: Partial<HintInput>) => buildHints({ ...input, ...patch })

describe('typed feedback rules', () => {
  it('only says Close match at 85 or above', () => {
    expect(hints({ score: 84 })).toEqual([{ kind: 'compare-reference' }])
    expect(hints({ score: 85 })).toEqual([{ kind: 'close-match' }])
    expect(hintText({ kind: 'compare-reference' })).not.toMatch(/close match/i)
  })
  it('timing limits are inclusive and ratios are rounded to one decimal', () => {
    expect(hints({ attemptActiveMs: 1340 })).toEqual([{ kind: 'compare-reference' }])
    expect(hints({ attemptActiveMs: 3000 })).toEqual([{ kind: 'compare-reference' }])
    expect(hints({ attemptActiveMs: 1339 })).toEqual([{ kind: 'timing', ratio: 0.7 }])
    expect(hints({ attemptActiveMs: 3130 })).toEqual([{ kind: 'timing', ratio: 1.6 }])
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
  it('keeps a time hint after path and formats every supported kind without finger claims', () => {
    expect(hints({ trajectoryContribution: 0.5, attemptActiveMs: 4000 }))
      .toEqual([{ kind: 'path' }, { kind: 'timing', ratio: 2 }])
    const all = [
      hintText({ kind: 'missing-hand', hand: 'both' }), hintText({ kind: 'missing-hand', hand: 'Right' }),
      hintText({ kind: 'untracked-attempt' }), hintText({ kind: 'untracked-reference' }),
      hintText({ kind: 'path' }), hintText({ kind: 'timing', ratio: 2 }),
      hintText({ kind: 'close-match' }), hintText({ kind: 'close-match' }, true),
      hintText({ kind: 'compare-reference' }),
    ]
    expect(all.every((text) => text.length > 10 && !text.startsWith('Check your '))).toBe(true)
  })
})
