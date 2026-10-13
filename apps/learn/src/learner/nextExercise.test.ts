import { describe, expect, it } from 'vitest'
import type { AttemptLogEntry } from './attemptLog'
import { nextExercise } from './nextExercise'

// Log control fixtures only, not sign content.
function entry(score: number, minute: number, patch: Partial<AttemptLogEntry> = {}): AttemptLogEntry {
  return { id: `fixture-${minute}`, gloss: 'FIXTURE', score, referenceId: 'fixture-reference',
    worstFingers: [], createdAt: new Date(Date.UTC(2026, 9, 13, 12, minute)).toISOString(), ...patch }
}

describe('next exercise rules', () => {
  it('starts with Try at the existing 0.5x teaching speed', () => {
    expect(nextExercise('FIXTURE', [])).toEqual({ stage: 'try', recallUnlocked: false,
      suggestedSpeed: 0.5, offerGhost: false, reason: 'try: build reference match' })
  })
  it('offers 0.25x plus ghost after two consecutive Try matches below 60, including legacy logs', () => {
    const attempts = [entry(40, 0), entry(59.99, 1, { stage: 'try' })]
    const copy = structuredClone(attempts)
    expect(nextExercise('FIXTURE', [...attempts].reverse())).toEqual({ stage: 'try', recallUnlocked: false,
      suggestedSpeed: 0.25, offerGhost: true, reason: 'retry: last two tries below 60' })
    expect(attempts).toEqual(copy)
    expect(nextExercise('FIXTURE', [entry(40, 0), entry(60, 1)]).stage).toBe('try')
    expect(nextExercise('FIXTURE', [entry(40, 0), entry(60, 1)])).toMatchObject({ suggestedSpeed: 0.5, offerGhost: false })
  })
  it('steps back from a Recall below 60 without deleting previously earned unlocks', () => {
    expect(nextExercise('FIXTURE', [entry(70, 0), entry(59.99, 1, { stage: 'recall', revealed: false })]))
      .toEqual({ stage: 'try', recallUnlocked: true, suggestedSpeed: 0.5, offerGhost: false, reason: 'retry: recall below 60' })
  })
  it('unlocks Recall at 70, rather than the old 85 threshold', () => {
    expect(nextExercise('FIXTURE', [entry(69.99, 0)]).recallUnlocked).toBe(false)
    expect(nextExercise('FIXTURE', [entry(70, 0)])).toEqual({ stage: 'recall', recallUnlocked: true, reason: 'recall: Try match reached 70' })
    expect(nextExercise('FIXTURE', [entry(85, 0)]).stage).toBe('recall')
  })
  it('does not count an intervening Recall as a consecutive low Try', () => {
    const result = nextExercise('FIXTURE', [entry(40, 0), entry(60, 1, { stage: 'recall' }), entry(40, 2)])
    expect(result).toMatchObject({ stage: 'try', suggestedSpeed: 0.5, offerGhost: false })
  })
  it('ignores sentence/invalid/other-sign attempts when choosing an isolated exercise', () => {
    const result = nextExercise('FIXTURE', [entry(70, 0), entry(0, 1, { stage: 'sentence' }),
      entry(0, 2, { gloss: 'OTHER_FIXTURE' }), entry(NaN, 3)])
    expect(result.stage).toBe('recall')
    expect(nextExercise('FIXTURE', [entry(90, 0, { stage: 'recall' })]).stage).toBe('try')
  })
  it('keeps successful Recall available, distinguishing revealed from unrevealed takes', () => {
    expect(nextExercise('FIXTURE', [entry(70, 0), entry(60, 1, { stage: 'recall', revealed: false })]))
      .toMatchObject({ stage: 'recall', reason: 'recall: keep practising from memory' })
    expect(nextExercise('FIXTURE', [entry(70, 0), entry(60, 1, { stage: 'recall', revealed: true })]))
      .toMatchObject({ stage: 'recall', reason: 'recall: retry without revealing' })
  })
})
