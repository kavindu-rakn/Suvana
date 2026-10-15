import { describe, expect, it } from 'vitest'
import { CURRICULUM_UNITS } from '../data/curriculum'
import { startHeroSession } from './heroSession'
import type { AttemptLogEntry } from './attemptLog'

const glosses = [...new Set(CURRICULUM_UNITS.flatMap(unit => unit.signs))]
describe('Hero curriculum entry', () => {
  it('starts Starter at its first sign, and keeps the session finite', () => {
    const session = startHeroSession(CURRICULUM_UNITS, glosses, [])!
    expect(session.unitId).toBe(CURRICULUM_UNITS[0].id)
    expect(session.glosses[0]).toBe(CURRICULUM_UNITS[0].signs[0])
    expect(session.glosses.length).toBeLessThanOrEqual(8)
    expect(new Set(session.glosses).size).toBe(session.glosses.length)
    expect(session.recommendations?.[0].reason).toBe('First sign in this unit.')
  })
  it('starts the next open unit before old due reviews', () => {
    const attempts: AttemptLogEntry[] = CURRICULUM_UNITS[0].signs.map((gloss, i) => ({
      id: `synthetic-${i}`, gloss, referenceId: 'fixture', score: 60, stage: 'try',
      worstFingers: [], createdAt: '2026-10-01T00:00:00Z',
    }))
    const session = startHeroSession(CURRICULUM_UNITS, glosses, attempts)!
    expect(session.unitId).toBe(CURRICULUM_UNITS[1].id)
    expect(session.glosses[0]).toBe(CURRICULUM_UNITS[1].signs[0])
  })
  it('does not start an unavailable curriculum', () => {
    expect(startHeroSession(CURRICULUM_UNITS, [], [])).toBeNull()
    expect(startHeroSession([], glosses, [])).toBeNull()
  })
})
