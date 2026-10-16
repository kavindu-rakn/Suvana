import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CURRICULUM_UNITS } from '../data/curriculum'
import { contentCoverage, filterContentIndex } from '../storage/bundledReferences'
import type { RecordingMeta } from '../vision/types'
import type { AttemptLogEntry } from './attemptLog'
import { unitState } from './game'
import { pathUnitState } from './pathContent'
import { summarizeAll } from './mastery'
import { startUnitSession } from './session'

const packed = JSON.parse(readFileSync('public/reference-index.json', 'utf8')) as {
  sources: Record<string, Partial<RecordingMeta>>, recordings: RecordingMeta[],
}
const index = packed.recordings.map(rec => ({ ...(rec.source ? packed.sources[rec.source] : {}), ...rec }))
const cc0 = filterContentIndex(index, 'cc0')
// Synthetic progress against existing corpus labels, never learner results.
const attempts: AttemptLogEntry[] = index.map((rec, i) => ({
  id: `coverage-fixture-${i}`, gloss: rec.gloss, referenceId: rec.id,
  score: 70, stage: 'try', worstFingers: [], createdAt: '2026-10-14T10:00:00Z',
}))

describe('Path edition coverage', () => {
  it('preserves full-edition reward states and approved curriculum membership/order', () => {
    const before = JSON.stringify(CURRICULUM_UNITS)
    for (const unit of CURRICULUM_UNITS) {
      expect(pathUnitState(unit, CURRICULUM_UNITS, [], index)).toBe(unitState(unit, CURRICULUM_UNITS, []))
      expect(pathUnitState(unit, CURRICULUM_UNITS, attempts, index)).toBe(unitState(unit, CURRICULUM_UNITS, attempts))
    }
    expect(JSON.stringify(CURRICULUM_UNITS)).toBe(before)
  })

  it('keeps incomplete units Preview even with stars for every sign from the full edition', () => {
    const incomplete = CURRICULUM_UNITS.filter(unit => contentCoverage(unit.signs, cc0).preview)
    expect(incomplete.length).toBeGreaterThan(0)
    for (const unit of incomplete) expect(pathUnitState(unit, CURRICULUM_UNITS, attempts, cc0)).toBe('preview')
  })

  it('does not let old full-edition stars unlock a complete unit after a Preview unit', () => {
    const position = CURRICULUM_UNITS.findIndex(unit => contentCoverage(unit.signs, cc0).preview)
    const successor = CURRICULUM_UNITS.slice(position + 1).find(unit => !contentCoverage(unit.signs, cc0).preview)!
    expect(successor).toBeDefined()
    expect(unitState(successor, CURRICULUM_UNITS, attempts)).not.toBe('locked')
    expect(pathUnitState(successor, CURRICULUM_UNITS, attempts, cc0)).toBe('locked')
    expect(pathUnitState(CURRICULUM_UNITS[0], CURRICULUM_UNITS, attempts, cc0)).toBe('passed')
  })

  it('fails closed on an unavailable index and on unapproved curriculum', () => {
    expect(pathUnitState(CURRICULUM_UNITS[0], CURRICULUM_UNITS, attempts, [])).toBe('preview')
    const proposed = { ...CURRICULUM_UNITS[0], status: 'proposed' as const }
    expect(pathUnitState(proposed, [proposed], attempts, index)).toBe('preview')
    expect(pathUnitState(CURRICULUM_UNITS[1], [proposed, CURRICULUM_UNITS[1]], attempts, index)).toBe('locked')
  })

  it('queues only edition-available signs, including due reviews from other units', () => {
    const summaries = summarizeAll([...new Set(cc0.map(rec => rec.gloss))], attempts)
    const session = startUnitSession(CURRICULUM_UNITS[0], summaries, new Date('2026-10-16T12:00:00Z'))
    expect(session.glosses.length).toBeGreaterThan(0)
    expect(session.glosses.every(gloss => cc0.some(rec => rec.gloss === gloss))).toBe(true)
    const incomplete = CURRICULUM_UNITS.find(unit => contentCoverage(unit.signs, cc0).preview)!
    expect(() => startUnitSession(incomplete, summaries)).toThrow('Unit references are not loaded')
  })
})
