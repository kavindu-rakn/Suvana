import { describe, expect, it } from 'vitest'
import { buildReplayPlan, replayFocusStep, replayStepAt } from './replayPlan'
const frames = [0, 100, 200, 400].map(timestampMs => ({ timestampMs, hands: [] }))
describe('original-frame replay plan', () => {
  it('holds repeated indices and preserves gaps on one display clock', () => {
    const steps = buildReplayPlan(frames, frames, [[0, 0], [1, 0], [1, 1], [3, 2]])
    expect(steps.map(step => step.timeMs)).toEqual([0, 100, 200, 500])
    expect(replayStepAt(steps, 199)).toBe(1)
    expect(replayStepAt(steps, 200)).toBe(2)
    expect(replayStepAt(steps, 900)).toBe(3)
    expect(replayFocusStep(steps, 0)).toBe(0)
    expect(replayFocusStep(steps, 2)).toBe(3)
    expect(replayFocusStep(steps, 99)).toBe(-1)
  })
  it('drops invalid/backward/duplicate pairs without synthesizing alignment', () => {
    expect(buildReplayPlan(frames, frames, [[-1, 0], [0, 0], [0, 0], [2, 2], [1, 3], [7, 8], [3, 3.5]]))
      .toEqual([{ referenceIndex: 0, attemptIndex: 0, timeMs: 0 }, { referenceIndex: 2, attemptIndex: 2, timeMs: 200 }])
    expect(buildReplayPlan(frames, frames)).toEqual([])
    expect(buildReplayPlan([], [], [[0, 0]])).toEqual([])
  })
})
