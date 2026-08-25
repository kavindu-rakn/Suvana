import { describe, expect, it } from 'vitest'
import type { AttemptLogEntry } from './attemptLog'
import { currentStreak, dailyActivity, dayKey } from './activity'

let n = 0
function attempt(score: number, createdAt: Date): AttemptLogEntry {
  return {
    id: `a${n++}`,
    gloss: 'ME',
    referenceId: 'ref',
    score,
    worstFingers: [],
    createdAt: createdAt.toISOString(),
  }
}

/**
 * A fixed local noon, so every case is anchored well away from a day boundary
 * and the suite does not behave differently by the runner's timezone.
 */
const NOW = new Date(2026, 6, 11, 12, 0, 0)

/** A local Date `days` before NOW, at `hour`. */
function ago(days: number, hour = 12): Date {
  return new Date(2026, 6, 11 - days, hour, 0, 0)
}

describe('dayKey', () => {
  it('uses the local calendar day, not the UTC one', () => {
    // 23:50 local — in any timezone east or west of UTC this is a different
    // UTC date, and the learner would still call it the same day's practice.
    const late = new Date(2026, 6, 11, 23, 50, 0)
    expect(dayKey(late)).toBe('2026-07-11')
  })

  it('zero-pads month and day', () => {
    expect(dayKey(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('dailyActivity', () => {
  it('returns one bucket per day, oldest first, including empty days', () => {
    const buckets = dailyActivity([attempt(80, ago(0))], 7, NOW)
    expect(buckets).toHaveLength(7)
    expect(buckets[0].date < buckets[6].date).toBe(true)
    expect(buckets[6].date).toBe(dayKey(NOW))
    expect(buckets[0].attempts).toBe(0)
    expect(buckets[0].avgScore).toBeNull()
  })

  it('counts attempts and averages scores within a day', () => {
    const buckets = dailyActivity([attempt(80, ago(1, 9)), attempt(90, ago(1, 18))], 3, NOW)
    const yesterday = buckets[1]
    expect(yesterday.attempts).toBe(2)
    expect(yesterday.avgScore).toBe(85)
  })

  it('ignores attempts older than the window', () => {
    const buckets = dailyActivity([attempt(80, ago(30))], 7, NOW)
    expect(buckets.every((b) => b.attempts === 0)).toBe(true)
  })
})

describe('currentStreak', () => {
  it('is zero with no attempts', () => {
    expect(currentStreak([], NOW)).toBe(0)
  })

  it('counts consecutive days ending today', () => {
    const log = [attempt(70, ago(2)), attempt(75, ago(1)), attempt(80, ago(0))]
    expect(currentStreak(log, NOW)).toBe(3)
  })

  it('keeps the streak alive when today has no attempt yet', () => {
    // Practised yesterday and the day before; today is still young.
    const log = [attempt(70, ago(2)), attempt(75, ago(1))]
    expect(currentStreak(log, NOW)).toBe(2)
  })

  it('resets once a whole day is missed', () => {
    const log = [attempt(70, ago(4)), attempt(75, ago(3))]
    expect(currentStreak(log, NOW)).toBe(0)
  })

  it('counts a day once however many attempts it holds', () => {
    const log = [attempt(70, ago(0, 9)), attempt(75, ago(0, 10)), attempt(80, ago(0, 11))]
    expect(currentStreak(log, NOW)).toBe(1)
  })

  it('stops at the first gap rather than counting every practised day', () => {
    const log = [attempt(70, ago(9)), attempt(70, ago(8)), attempt(75, ago(1)), attempt(80, ago(0))]
    expect(currentStreak(log, NOW)).toBe(2)
  })
})
