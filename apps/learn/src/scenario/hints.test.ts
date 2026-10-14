import { describe, expect, it } from 'vitest'
import { SCENARIOS } from '../data/scenarios'
import { scenarioHint } from './hints'

describe('scenario hint visibility', () => {
  it('marks all existing authored hints as waiting for signer validation', () => {
    const turns = SCENARIOS.flatMap(s => s.turns)
    expect(turns).toHaveLength(12)
    for (const turn of turns) {
      expect(turn.hint).toBeTruthy()
      expect(turn.pendingSignerValidation).toBe(true)
    }
  })

  it('hides every hint from learners and preserves the exact text for authors', () => {
    for (const scenario of SCENARIOS) {
      for (const turn of scenario.turns) {
        expect(scenarioHint(turn, false)).toBeUndefined()
        expect(scenarioHint(turn, true)).toBe(turn.hint)
      }
    }
  })

  it('does not leak an unflagged authored hint', () => {
    const turn = { ...SCENARIOS[0].turns[0], pendingSignerValidation: undefined }
    expect(scenarioHint(turn, false)).toBeUndefined()
  })
})
