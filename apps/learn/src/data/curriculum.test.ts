import { describe, expect, it } from 'vitest'
import { CURRICULUM_UNITS, getStarterUnit, getUnit } from './curriculum'
import indexRaw from '../../public/reference-index.json'

describe('curriculum units', () => {
  const sources = (indexRaw as any).sources || {}
  const recordings: any[] = ((indexRaw as any).recordings || []).map((r: any) => ({
    ...(r.source ? sources[r.source] : {}),
    ...r,
  }))
  const byGloss = new Map(recordings.map((r) => [r.gloss, r]))

  it('exports non-empty curriculum units list', () => {
    expect(CURRICULUM_UNITS.length).toBeGreaterThan(5)
  })

  it('marks every unit with status proposed pending K-05 review', () => {
    for (const unit of CURRICULUM_UNITS) {
      expect(unit.status).toBe('proposed')
      expect(unit.id).toBeTruthy()
      expect(unit.title).toBeTruthy()
      expect(unit.signs.length).toBeGreaterThan(0)
    }
  })

  it('satisfies all hard rules for U1 Starter', () => {
    const u1 = getStarterUnit()
    expect(u1.id).toBe('u1-starter')
    expect(u1.signs.length).toBeGreaterThanOrEqual(5)
    expect(u1.signs.length).toBeLessThanOrEqual(8)

    // Check each U1 sign against reference index metadata
    for (const gloss of u1.signs) {
      const ref = byGloss.get(gloss)
      expect(ref, `reference for ${gloss}`).toBeDefined()
      expect(ref.file?.startsWith('kaggle_'), `${gloss} must be kaggle_*`).toBe(true)
      expect(ref.hands, `${gloss} must be 1 hand`).toBe(1)
      expect(ref.motion, `${gloss} must be still`).toBe('still')
      const hasMeaningOrSelfExp = ref.hasMeaning || /^[A-Z]$|^\d+$/.test(gloss)
      expect(hasMeaningOrSelfExp, `${gloss} must have verified meaning or be self-explaining`).toBe(true)
    }

    // Check duration ordering (easiest first)
    for (let i = 1; i < u1.signs.length; i++) {
      const prevDur = byGloss.get(u1.signs[i - 1])?.durationMs || 0
      const currDur = byGloss.get(u1.signs[i])?.durationMs || 0
      expect(currDur, `duration of ${u1.signs[i]} >= ${u1.signs[i - 1]}`).toBeGreaterThanOrEqual(prevDur)
    }
  })

  it('looks up units with getUnit', () => {
    expect(getUnit('u1-starter')).toEqual(CURRICULUM_UNITS[0])
    expect(getUnit('nonexistent')).toBeUndefined()
  })
})
