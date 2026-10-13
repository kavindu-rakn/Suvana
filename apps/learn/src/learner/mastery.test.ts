import { describe, expect, it } from 'vitest'
import type { AttemptLogEntry } from './attemptLog'
import { isDueReview, practiceNeed, recommendNext, recommendationFor, suggestNext, summarizeAll, summarizeGloss } from './mastery'

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
  it('resurfaces a score-30 due review before an unseen sign with numeric need 1', () => {
    const summaries = summarizeAll(['STRUGGLING_FIXTURE', 'UNSEEN_FIXTURE'], [attempt('STRUGGLING_FIXTURE', 30, daysAgo(0))])
    expect(practiceNeed(summaries[0], NOW)).toBeCloseTo(0.525)
    expect(practiceNeed(summaries[1], NOW)).toBe(1)
    expect(suggestNext(summaries, NOW)).toBe('STRUGGLING_FIXTURE')
    expect(recommendNext(summaries, NOW)).toEqual({ gloss: 'STRUGGLING_FIXTURE', kind: 'review', reason: 'review: low match score' })
  })
  it('ranks due reviews by need and only introduces new signs when none are due', () => {
    const summaries = summarizeAll(['A_FIXTURE', 'B_FIXTURE', 'C_FIXTURE'],
      [attempt('A_FIXTURE', 30, daysAgo(0)), attempt('B_FIXTURE', 0, daysAgo(0))])
    expect(recommendNext(summaries, NOW)?.gloss).toBe('B_FIXTURE')
    expect(recommendNext(summaries.filter((s) => s.gloss !== 'B_FIXTURE'), NOW)?.gloss).toBe('A_FIXTURE')
    expect(recommendNext(summaries.filter((s) => s.attempts === 0), NOW)?.kind).toBe('new')
  })
  it('uses a strict >0.5 due threshold and preserves the explicit unit order', () => {
    const boundary = summarizeGloss('BOUNDARY_FIXTURE', [attempt('BOUNDARY_FIXTURE', 50, daysAgo(2.5))])
    expect(practiceNeed(boundary, NOW)).toBe(0.5)
    expect(isDueReview(boundary, NOW)).toBe(false)
    const summaries = [boundary, ...summarizeAll(['A_FIXTURE', 'Z_FIXTURE', 'OUTSIDE_FIXTURE'], [])]
    expect(recommendNext(summaries, NOW, ['Z_FIXTURE', 'A_FIXTURE'])?.gloss).toBe('Z_FIXTURE')
    expect(recommendNext(summaries, NOW, ['BOUNDARY_FIXTURE'])?.gloss).toBe('BOUNDARY_FIXTURE')
    expect(recommendNext(summaries, NOW, [])).toBeNull()
    expect(recommendNext(summaries.slice(1), NOW, [])).toBeNull()
  })
  it('explains an actual drop or staleness without inventing a prior score', () => {
    const dropped = summarizeGloss('DROP_FIXTURE', [attempt('DROP_FIXTURE', 90, daysAgo(1)),
      attempt('DROP_FIXTURE', 10, daysAgo(0, 0)), attempt('DROP_FIXTURE', 0, daysAgo(0, 1))])
    expect(recommendationFor(dropped, NOW).reason).toBe('review: score dropped')
    const stale = summarizeGloss('STALE_FIXTURE', [attempt('STALE_FIXTURE', 50, daysAgo(7))])
    expect(recommendationFor(stale, NOW).reason).toBe('review: not practised for 7 days')
    const fresh = summarizeGloss('FRESH_FIXTURE', [attempt('FRESH_FIXTURE', 90, daysAgo(0))])
    expect(recommendationFor(fresh, NOW).kind).toBe('practice')
  })
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
