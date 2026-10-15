export type PracticeStage = 'watch' | 'try' | 'recall'
export type PracticeStageEvent = 'select' | 'watch' | 'my-turn' | 'recall' | 'reveal' | 'retry'
export interface PracticeStageState { stage: PracticeStage; revealed: boolean }
export const initialPracticeStage = (): PracticeStageState => ({ stage: 'watch', revealed: false })

/** Teaching state is separate from capture/countdown/result. The UI supplies
 * the existing two-star unlock; revealing stays sticky for this take. */
export function practiceStageTransition(state: PracticeStageState, event: PracticeStageEvent, recallUnlocked = false): PracticeStageState {
  if (event === 'select' || event === 'watch') return initialPracticeStage()
  if (event === 'my-turn' && state.stage !== 'try') return { stage: 'try', revealed: false }
  if (event === 'recall' && state.stage === 'try' && recallUnlocked) return { stage: 'recall', revealed: false }
  if (event === 'reveal' && state.stage === 'recall') return { ...state, revealed: true }
  // Only the UI's completed-result retry path sends this event.
  if (event === 'retry' && state.stage === 'recall') return { stage: 'recall', revealed: false }
  return state
}
