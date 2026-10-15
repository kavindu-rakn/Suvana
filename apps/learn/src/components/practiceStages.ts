export type PracticeStage = 'watch' | 'try' | 'recall'
export type PracticeStageEvent = 'select' | 'watch' | 'my-turn' | 'recall' | 'reveal'
export interface PracticeStageState { stage: PracticeStage; revealed: boolean }
export const initialPracticeStage = (): PracticeStageState => ({ stage: 'watch', revealed: false })

/** Teaching state is separate from capture/countdown/result. Recall stays
 * disabled in L-16a; L-16b supplies its unlock and reveal policy. */
export function practiceStageTransition(state: PracticeStageState, event: PracticeStageEvent): PracticeStageState {
  if (event === 'select' || event === 'watch') return initialPracticeStage()
  if (event === 'my-turn' && state.stage === 'watch') return { stage: 'try', revealed: false }
  return state
}
