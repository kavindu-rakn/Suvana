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
  it('keeps Recall and reveal disabled before L-16b', () => {
    for (const state of [initialPracticeStage(), { stage: 'try', revealed: false } as const]) {
      expect(practiceStageTransition(state, 'recall')).toBe(state)
      expect(practiceStageTransition(state, 'reveal')).toBe(state)
    }
  })
})
