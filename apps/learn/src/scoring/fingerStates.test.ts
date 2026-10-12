import { describe, expect, it } from 'vitest'
import {
  FINGER_CUTOFFS,
  FINGER_STATE_LABEL,
  fingerDeviation,
  fingerState,
  fingerStates,
} from './fingerStates'
import { scoreAttempt } from './score'
import { buildRecording } from './testFixtures'

/** 21 joint deviations, all `base`, with the given landmarks overridden. */
function perLandmark(base: number, overrides: Record<number, number> = {}): number[] {
  return Array.from({ length: 21 }, (_, i) => overrides[i] ?? base)
}

describe('fingerState', () => {
  it('uses the kvn wording for the three states', () => {
    expect(Object.values(FINGER_STATE_LABEL)).toEqual(['Correct', 'Almost', 'Wrong'])
  })

  it('is Wrong above the hint threshold, Almost above the UI cut-off, else Correct', () => {
    const { wrongAbove, almostAbove } = FINGER_CUTOFFS
    expect(fingerState(wrongAbove + 0.001)).toBe('wrong')
    expect(fingerState(wrongAbove)).toBe('almost')
    expect(fingerState(almostAbove + 0.001)).toBe('almost')
    expect(fingerState(almostAbove)).toBe('correct')
    expect(fingerState(0)).toBe('correct')
  })

  it('accepts other cut-offs', () => {
    expect(fingerState(0.5, { wrongAbove: 1, almostAbove: 0.4 })).toBe('almost')
  })
})

describe('fingerDeviation', () => {
  it('takes the worst joint of the finger and ignores the wrist and other fingers', () => {
    // index = landmarks 5-8; wrist = 0; thumb = 1-4
    const per = perLandmark(0, { 0: 9, 2: 0.3, 6: 0.07, 8: 0.02 })
    expect(fingerDeviation(per, 'index')).toBe(0.07)
    expect(fingerDeviation(per, 'thumb')).toBe(0.3)
    expect(fingerDeviation(per, 'pinky')).toBe(0)
  })
})

describe('fingerStates', () => {
  it('gives one state per finger, thumb to little finger', () => {
    const per = perLandmark(0.01, { 3: 0.2, 10: 0.06 })
    expect(fingerStates({ perLandmark: per, missing: false })).toEqual([
      { finger: 'thumb', state: 'wrong' },
      { finger: 'index', state: 'correct' },
      { finger: 'middle', state: 'almost' },
      { finger: 'ring', state: 'correct' },
      { finger: 'pinky', state: 'correct' },
    ])
  })

  it('gives nothing for a missing hand or an unmeasured one', () => {
    expect(fingerStates({ perLandmark: perLandmark(0.5), missing: true })).toEqual([])
    expect(fingerStates({ perLandmark: [], missing: false })).toEqual([])
  })

  it('marks every finger Correct when an attempt matches the reference exactly', () => {
    const ref = buildRecording()
    const result = scoreAttempt(ref, ref)
    const states = result.hands.flatMap((h) => fingerStates(h)).map((f) => f.state)
    expect(states.length).toBeGreaterThan(0)
    expect(new Set(states)).toEqual(new Set(['correct']))
  })
})
