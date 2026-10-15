import { describe, expect, it } from 'vitest'
import { initialPracticeStage, practiceStageTransition } from './practiceStages'

describe('Watch then Try', () => {
  it('starts each selection at Watch and enters Try only on My turn', () => {
    const watch = initialPracticeStage()
    expect(watch).toEqual({ stage: 'watch', revealed: false })
    const trying = practiceStageTransition(watch, 'my-turn')
    expect(trying.stage).toBe('try')
    expect(practiceStageTransition(trying, 'my-turn')).toBe(trying)
    expect(practiceStageTransition(trying, 'select')).toEqual(watch)
    expect(practiceStageTransition(trying, 'watch')).toEqual(watch)
  })
  it('keeps Recall locked without the game-layer unlock', () => {
    for (const state of [initialPracticeStage(), { stage: 'try', revealed: false } as const]) {
      expect(practiceStageTransition(state, 'recall')).toBe(state)
      expect(practiceStageTransition(state, 'reveal')).toBe(state)
    }
  })
  it('unlocks Recall from Try and keeps a reveal sticky until a new take', () => {
    const trying = practiceStageTransition(initialPracticeStage(), 'my-turn')
    const recall = practiceStageTransition(trying, 'recall', true)
    expect(recall).toEqual({ stage: 'recall', revealed: false })
    expect(practiceStageTransition(initialPracticeStage(), 'recall', true).stage).toBe('watch')
    const revealed = practiceStageTransition(recall, 'reveal', true)
    expect(revealed.revealed).toBe(true)
    expect(practiceStageTransition(revealed, 'recall', true)).toBe(revealed)
    expect(practiceStageTransition(revealed, 'retry', true)).toEqual(recall)
    expect(practiceStageTransition(revealed, 'my-turn').stage).toBe('try')
    expect(practiceStageTransition(revealed, 'select')).toEqual(initialPracticeStage())
  })
})
