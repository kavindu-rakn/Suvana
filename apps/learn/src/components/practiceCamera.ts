export interface PracticeCameraIntent { wanted: boolean; away: boolean; restorePending: boolean }
export type PracticeCameraEvent = 'start' | 'stop' | 'leave-surface' | 'away' | 'return' | 'failed'
export function initialCameraIntent(away = false): PracticeCameraIntent {
  return { wanted: false, away, restorePending: false }
}

/** Own only view-level intent. The vision hook retains track-loss, generation
 * cancellation and iPhone blur/focus recovery. Duplicate return events consume
 * one pending restart; leaving a practice surface revokes it immediately. */
export function cameraIntentTransition(state: PracticeCameraIntent, event: PracticeCameraEvent): {
  state: PracticeCameraIntent; action: 'start' | 'stop' | 'none'
} {
  if (event === 'start') return { state: { ...state, wanted: true, restorePending: state.away }, action: state.away ? 'none' : 'start' }
  if (event === 'stop' || event === 'leave-surface' || event === 'failed') return {
    state: { ...state, wanted: false, restorePending: false }, action: event === 'failed' ? 'none' : 'stop',
  }
  if (event === 'away') return state.away ? { state, action: 'none' } : {
    state: { ...state, away: true, restorePending: state.wanted }, action: state.wanted ? 'stop' : 'none',
  }
  return { state: { ...state, away: false, restorePending: false }, action: state.restorePending && state.wanted ? 'start' : 'none' }
}
