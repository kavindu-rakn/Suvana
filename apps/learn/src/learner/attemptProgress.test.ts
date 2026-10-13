import { describe, expect, it } from 'vitest'
import type { AttemptLogEntry } from './attemptLog'
import type { HandScore, ScoreResult } from '../scoring/score'
import { progressAgainstEarlier, shouldLogAttempt } from './attemptProgress'

function entry(id: string, gloss: string, score: number): AttemptLogEntry {
  return { id, gloss, referenceId: 'ref', score, worstFingers: [], createdAt: `2026-10-14T00:00:0${id}Z` }
}

function hand(missing: boolean): HandScore {
  return { handedness: 'Right', score: missing ? 0 : 70, normalizedDistance: 0, perLandmark: [], missing }
}

function result(hands: HandScore[]): ScoreResult {
  return {
    score: 0,
    normalizedDistance: 0,
    hands,
    worstJoints: [],
    hints: [],
    mirrored: false,
    twoHanded: hands.length > 1,
  }
}

describe('shouldLogAttempt', () => {
  it('does not log a take scored against a reference with no tracked hands', () => {
    expect(shouldLogAttempt(result([]))).toBe(false)
  })

  it('does not log a take where every hand is missing', () => {
    expect(shouldLogAttempt(result([hand(true), hand(true)]))).toBe(false)
  })

  it('logs a take where at least one hand was compared', () => {
    expect(shouldLogAttempt(result([hand(false)]))).toBe(true)
    expect(shouldLogAttempt(result([hand(false), hand(true)]))).toBe(true)
  })
})

describe('progressAgainstEarlier', () => {
  it('has no delta on the first attempt at a sign', () => {
    const entries = [entry('1', 'ME', 60)]
    expect(progressAgainstEarlier(entries, 'ME', '1', 60)).toEqual({ delta: null, best: false })
  })

  it('compares with the previous attempt at the same sign, ignoring other signs', () => {
    const entries = [entry('1', 'ME', 50), entry('2', 'YOU', 90), entry('3', 'ME', 70)]
    expect(progressAgainstEarlier(entries, 'ME', '3', 70)).toEqual({ delta: 20, best: true })
  })

  it('keeps the previous attempt when the current take was not logged', () => {
    // The current take ('9') is not in the log; slicing off the last entry
    // would have compared against '1' instead of '2'.
    const entries = [entry('1', 'ME', 40), entry('2', 'ME', 80)]
    expect(progressAgainstEarlier(entries, 'ME', '9', 70)).toEqual({ delta: -10, best: false })
  })

  it('is not a best when it only ties the earlier best', () => {
    const entries = [entry('1', 'ME', 80), entry('2', 'ME', 80)]
    expect(progressAgainstEarlier(entries, 'ME', '2', 80).best).toBe(false)
  })
})
