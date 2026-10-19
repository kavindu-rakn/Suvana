import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AttemptLogEntry, AttemptStage } from './attemptLog'
import { band } from '../scoring/band'
import { DAILY_GOAL, dailyGoal, isScoredAttempt, starsFor, streak, unitState, xp } from './game'

// Synthetic log/unit control fixtures, not SSL content or learner results.
let sequence = 0
const NOW = new Date(2026, 9, 13, 18)
function entry(score: number, patch: Partial<AttemptLogEntry> = {}): AttemptLogEntry {
  return { id: `fixture-${sequence++}`, gloss: 'ITEM_A', referenceId: 'fixture-ref', score,
    worstFingers: [], createdAt: new Date(2026, 9, 13, 12).toISOString(), ...patch }
}
function dayEntries(day: number, count = DAILY_GOAL, month = 9): AttemptLogEntry[] {
  return Array.from({ length: count }, () => entry(0, { createdAt: new Date(2026, month, day, 12).toISOString() }))
}
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs() })

describe('approved stars and XP', () => {
  it('awards no Try star below 60, one at 60, and two at 70', () => {
    for (const [score, stars] of [[0, 0], [59.99, 0], [60, 1], [69.99, 1], [70, 2], [100, 2]]) {
      expect(starsFor('ITEM_A', [entry(score)])).toBe(stars)
    }
    expect(starsFor('ITEM_A', [])).toBe(0)
    expect(starsFor('OTHER_ITEM', [entry(100)])).toBe(0)
    expect(band(59).label).toBe('Keep practising')
  })
  it('keeps best Try stars through lower scores and alternate references', () => {
    expect(starsFor('ITEM_A', [entry(70), entry(60), entry(0, { referenceId: 'another-fixture' })])).toBe(2)
    expect(starsFor('ITEM_A', [entry(60), entry(60)])).toBe(1)
  })
  it('requires a prior two-star Try, then an unrevealed Recall at 60', () => {
    const prior = entry(70, { createdAt: '2026-10-13T01:00:00Z', stage: 'try' })
    const recall = entry(60, { createdAt: '2026-10-13T01:01:00Z', stage: 'recall', revealed: false })
    expect(starsFor('ITEM_A', [recall, prior])).toBe(3)
    expect(starsFor('ITEM_A', [recall])).toBe(0)
    expect(starsFor('ITEM_A', [prior, { ...recall, score: 59.99 }])).toBe(2)
    expect(starsFor('ITEM_A', [prior, { ...recall, revealed: true }])).toBe(2)
    expect(starsFor('ITEM_A', [prior, { ...recall, revealed: undefined }])).toBe(2)
    expect(starsFor('ITEM_A', [{ ...prior, score: 60 }, recall])).toBe(1)
    expect(starsFor('ITEM_A', [{ ...prior, createdAt: '2026-10-13T01:02:00Z' }, recall])).toBe(2)
    expect(starsFor('ITEM_A', [prior, { ...recall, createdAt: prior.createdAt }])).toBe(2)
    expect(starsFor('ITEM_A', [prior, recall, entry(0)])).toBe(3)
  })
  it('rejects malformed scored entries and never awards isolated stars for a sentence', () => {
    const invalid = [entry(NaN), entry(Infinity), entry(-1), entry(101),
      entry(90, { createdAt: 'bad-date' }), entry(90, { stage: 'watch' as AttemptStage })]
    expect(invalid.every((attempt) => !isScoredAttempt(attempt))).toBe(true)
    expect(starsFor('ITEM_A', invalid)).toBe(0)
    expect(starsFor('ITEM_A', [entry(100, { stage: 'sentence' })])).toBe(0)
    expect(isScoredAttempt(entry(60, { stage: 'recall' }))).toBe(true)
  })
  it('sums best stars once per gloss, including signs outside units, without modifying history', () => {
    const attempts = [entry(70), entry(70), entry(60, { gloss: 'ITEM_B' }),
      entry(100, { gloss: 'SENTENCE_FIXTURE', stage: 'sentence' })]
    const copy = structuredClone(attempts)
    expect(xp(attempts)).toBe(3)
    expect(xp([])).toBe(0)
    expect(attempts).toEqual(copy)
  })
})

describe('unit states', () => {
  const units = [{ id: 'fixture-unit-1', signs: ['ITEM_A', 'ITEM_B'] },
    { id: 'fixture-unit-2', signs: ['ITEM_C'] }, { id: 'fixture-unit-3', signs: ['ITEM_D'] }]
  const firstPassed = [entry(60), entry(60, { gloss: 'ITEM_B' })]
  it('keeps the first unit open and unknown/later units locked until predecessors pass', () => {
    expect(unitState(units[0], units, [])).toBe('open')
    expect(unitState({ id: 'unknown', signs: [] }, units, [])).toBe('locked')
    expect(unitState(units[1], units, [entry(100, { gloss: 'ITEM_C' })])).toBe('locked')
    expect(unitState(units[0], units, [entry(60)])).toBe('open')
    expect(unitState(units[1], units, [entry(100)])).toBe('locked')
    expect(unitState(units[1], units, [entry(100), entry(59, { gloss: 'ITEM_B' })])).toBe('locked')
    expect(unitState(units[0], units, firstPassed)).toBe('passed')
    expect(unitState(units[1], units, firstPassed)).toBe('open')
    expect(unitState(units[2], units, [...firstPassed, entry(60, { gloss: 'ITEM_C' })])).toBe('open')
  })
  it('separates pass from mastery at EWMA >=0.85 after three isolated attempts', () => {
    const oneUnit = [{ id: 'fixture-unit', signs: ['ITEM_A'] }]
    expect(unitState(oneUnit[0], oneUnit, [entry(100)])).toBe('passed')
    expect(unitState(oneUnit[0], oneUnit, [entry(85), entry(85), entry(85)])).toBe('mastered')
    expect(unitState(oneUnit[0], oneUnit, [entry(84), entry(84), entry(84)])).toBe('passed')
    expect(unitState(oneUnit[0], oneUnit, [entry(60), ...Array.from({ length: 3 }, () => entry(100, { stage: 'sentence' }))])).toBe('passed')
    expect(unitState(oneUnit[0], oneUnit, [entry(85), entry(85), entry(85), entry(0, { createdAt: 'invalid' })])).toBe('mastered')
  })
  it('never passes or masters an empty unit or opens its successor', () => {
    const empty = { id: 'empty', signs: [] }
    expect(unitState(empty, [empty, units[0]], [])).toBe('open')
    expect(unitState(units[0], [empty, units[0]], firstPassed)).toBe('locked')
  })
})

describe('local-day goals and streaks', () => {
  it('counts scored zero, Try/Recall/sentence and legacy attempts; deduplicates IDs', () => {
    const attempts = [entry(0), entry(60, { stage: 'try' }), entry(60, { stage: 'recall' }), entry(60, { stage: 'sentence' })]
    expect(dailyGoal(attempts, NOW)).toEqual({ count: 4, target: 5, remaining: 1, met: false })
    expect(dailyGoal([...attempts, attempts[0], entry(NaN), ...dayEntries(12),
      entry(80, { createdAt: new Date(2026, 9, 13, 20).toISOString() }), entry(0)], NOW))
      .toEqual({ count: 5, target: 5, remaining: 0, met: true })
    expect(dailyGoal(dayEntries(13, 6), NOW).count).toBe(6)
    expect(dailyGoal([], NOW).met).toBe(false)
  })
  it('ends on today if complete, retains yesterday while today is unfinished, and breaks on a gap', () => {
    const previous = [...dayEntries(10), ...dayEntries(11), ...dayEntries(12)]
    expect(streak([...previous, ...dayEntries(13)], NOW)).toBe(4)
    expect(streak([...previous, ...dayEntries(13, 2)], NOW)).toBe(3)
    expect(streak([...dayEntries(10), ...dayEntries(12)], NOW)).toBe(1)
    expect(streak(dayEntries(11), NOW)).toBe(0)
    expect(streak([], NOW)).toBe(0)
  })
  it('uses calendar boundaries across spring and fall DST transitions', () => {
    vi.stubEnv('TZ', 'America/New_York')
    for (const [month, today] of [[2, 9], [10, 2]]) {
      const now = new Date(2026, month, today, 0, 30)
      const attempts = [...dayEntries(today - 2, 5, month), ...dayEntries(today - 1, 5, month),
        ...Array.from({ length: 5 }, () => entry(0, { createdAt: new Date(2026, month, today, 0, 10).toISOString() }))]
      expect(streak(attempts, now)).toBe(3)
      expect(dailyGoal(attempts, now).count).toBe(5)
    }
  })
  it('supports the default clock, validates custom targets/dates and rolls over at midnight', () => {
    // Construct in the currently active zone: Node on Windows can cache a zone
    // after the prior TZ override even when the environment key is restored.
    const clock = new Date(2026, 9, 13, 18)
    vi.useFakeTimers()
    vi.setSystemTime(clock)
    expect(dailyGoal(dayEntries(13)).met).toBe(true)
    expect(streak(dayEntries(13))).toBe(1)
    expect(dailyGoal(dayEntries(13, 1), clock, 1).met).toBe(true)
    expect(streak(dayEntries(13, 1), clock, 1)).toBe(1)
    expect(dailyGoal(dayEntries(13), new Date(2026, 9, 14)).count).toBe(0)
    expect(streak(dayEntries(13), new Date(2026, 9, 15))).toBe(0)
    for (const target of [0, -1, 1.5, NaN]) {
      expect(() => dailyGoal([], NOW, target)).toThrow('positive integer')
      expect(() => streak([], NOW, target)).toThrow('positive integer')
    }
    expect(() => dailyGoal([], new Date(NaN))).toThrow('Invalid goal date')
    expect(() => streak([], new Date(NaN))).toThrow('Invalid goal date')
  })
})
