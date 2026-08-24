import { describe, expect, it } from 'vitest'
import type { AttemptLogEntry } from './attemptLog'
import { practiceNeed, suggestNext, summarizeAll, summarizeGloss } from './mastery'

let n = 0
function attempt(gloss: string, score: number, createdAt: string): AttemptLogEntry {
  return { id: `a${n++}`, gloss, referenceId: 'ref', score, worstFingers: [], createdAt }
}

/** ISO timestamps a fixed number of days before `NOW`, keeping order stable. */
const NOW = new Date('2026-07-11T12:00:00Z')
function daysAgo(days: number, seq = 0): string {
  return new Date(NOW.getTime() - days * 86_400_000 + seq * 60_000).toISOString()
}

describe('summarizeGloss', () => {
  it('marks a never-attempted sign as new with zero mastery', () => {
    const s = summarizeGloss('ME', [])
    expect(s.level).toBe('new')
    expect(s.mastery).toBe(0)
    expect(s.attempts).toBe(0)
    expect(s.lastScore).toBeNull()
  })

  it('marks consistent high scores as mastered', () => {
    const s = summarizeGloss('ME', [
      attempt('ME', 90, daysAgo(2, 0)),
      attempt('ME', 92, daysAgo(2, 1)),
      attempt('ME', 95, daysAgo(1, 0)),
    ])
    expect(s.level).toBe('mastered')
    expect(s.mastery).toBeGreaterThan(0.85)
  })

  it('does not grant mastered off fewer than 3 attempts, however high', () => {
    const s = summarizeGloss('ME', [
      attempt('ME', 98, daysAgo(1, 0)),
      attempt('ME', 97, daysAgo(1, 1)),
    ])
    expect(s.level).toBe('improving')
  })

  it('weights recent attempts more: improving beats declining', () => {
    const improving = summarizeGloss('A', [
      attempt('A', 0, daysAgo(3, 0)),
      attempt('A', 100, daysAgo(2, 0)),
      attempt('A', 100, daysAgo(1, 0)),
    ])
    const declining = summarizeGloss('B', [
      attempt('B', 100, daysAgo(3, 0)),
      attempt('B', 100, daysAgo(2, 0)),
      attempt('B', 0, daysAgo(1, 0)),
    ])
    expect(improving.mastery).toBeGreaterThan(declining.mastery)
  })

  it('keeps at most the last 8 scores, oldest → newest', () => {
    const entries = Array.from({ length: 12 }, (_, i) => attempt('ME', i * 5, daysAgo(0, i)))
    const s = summarizeGloss('ME', entries)
    expect(s.recentScores).toHaveLength(8)
    expect(s.recentScores[7]).toBe(55) // the latest (11 * 5)
    expect(s.recentScores[0]).toBe(20) // the 5th attempt (4 * 5)
  })
})

describe('practice selection', () => {
  it('suggests a never-attempted sign over practiced ones', () => {
    const entries = [attempt('ME', 40, daysAgo(0, 0))]
    const next = suggestNext(summarizeAll(['ME', 'YOU'], entries), NOW)
    expect(next).toBe('YOU')
  })

  it('suggests the weaker of two practiced signs', () => {
    const entries = [
      attempt('ME', 95, daysAgo(0, 0)),
      attempt('ME', 92, daysAgo(0, 1)),
      attempt('YOU', 35, daysAgo(0, 2)),
    ]
    expect(suggestNext(summarizeAll(['ME', 'YOU'], entries), NOW)).toBe('YOU')
  })

  it('lets staleness resurface an equally-scored sign practiced long ago', () => {
    const stale = summarizeGloss('OLD', [attempt('OLD', 80, daysAgo(10, 0))])
    const fresh = summarizeGloss('NEW', [attempt('NEW', 80, daysAgo(0, 0))])
    expect(practiceNeed(stale, NOW)).toBeGreaterThan(practiceNeed(fresh, NOW))
  })

  it('returns null for an empty vocabulary', () => {
    expect(suggestNext([], NOW)).toBeNull()
  })
})
