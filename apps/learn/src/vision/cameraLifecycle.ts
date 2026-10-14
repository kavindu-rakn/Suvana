/** Remove handlers before stop(): cleanup must never report a disconnect. */
export function releaseStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => {
    track.onended = null
    track.onmute = null
    track.onunmute = null
    track.stop()
  })
}

export type CameraTrackEvent = 'mute' | 'unmute' | 'ended'

export function watchStream(stream: MediaStream, changed: (event: CameraTrackEvent) => void) {
  stream.getVideoTracks().forEach((track) => {
    track.onended = () => changed('ended')
    track.onmute = () => changed('mute')
    track.onunmute = () => changed('unmute')
  })
}

// Untuned: iOS may report a lost track before reporting the app switch.
export const CAMERA_LOSS_GRACE_MS = 1500

export interface CameraInterruption {
  away: boolean
  lostAt: number | null
  ended: boolean
  interrupted: boolean
}

export const NO_CAMERA_INTERRUPTION: CameraInterruption = {
  away: false, lostAt: null, ended: false, interrupted: false,
}

type InterruptionEvent = CameraTrackEvent | 'away' | 'return' | 'timeout'

/** Pure event-order decision. Mute is reversible; ended requires a restart.
 * A visible loss has a bounded grace period, never an automatic retry loop. */
export function cameraInterruptionTransition(state: CameraInterruption, event: InterruptionEvent, now: number): {
  state: CameraInterruption; action: 'none' | 'pause' | 'resume' | 'fail'
} {
  if (event === 'mute' || event === 'ended') {
    return { state: { ...state, lostAt: state.lostAt ?? now,
      ended: state.ended || event === 'ended', interrupted: state.interrupted || state.away }, action: 'pause' }
  }
  if (event === 'away') {
    if (state.lostAt !== null && !state.interrupted && now - state.lostAt > CAMERA_LOSS_GRACE_MS) {
      return { state: { ...NO_CAMERA_INTERRUPTION, away: true }, action: 'fail' }
    }
    return { state: { ...state, away: true, interrupted: state.lostAt !== null || state.interrupted }, action: 'none' }
  }
  if (event === 'return') return { state: { ...state, away: false }, action: 'none' }
  if (event === 'unmute' && state.lostAt !== null && !state.ended) {
    return { state: { ...NO_CAMERA_INTERRUPTION, away: state.away }, action: state.away ? 'none' : 'resume' }
  }
  if (event === 'timeout' && state.lostAt !== null && !state.interrupted && !state.away) {
    return { state: NO_CAMERA_INTERRUPTION, action: 'fail' }
  }
  return { state, action: 'none' }
}

export interface CameraRestoreState {
  hidden: boolean
  wasRunningWhenHidden: boolean
  streamUsable: boolean
  starting: boolean
  restoring: boolean
}

/** One visibility/page-show recovery decision. A consumed/cleared intent does
 * not restart an off or failed camera. Live Android streams only resume play. */
export function cameraRestoreAction(state: CameraRestoreState): 'none' | 'play' | 'restart' {
  if (state.hidden || state.starting || state.restoring) return 'none'
  if (state.streamUsable) return 'play'
  return state.wasRunningWhenHidden ? 'restart' : 'none'
}

/** A failed GPU setup gets exactly one CPU attempt. */
export async function withCpuFallback<T>(create: (delegate: 'GPU' | 'CPU') => Promise<T>) {
  try {
    return await create('GPU')
  } catch {
    return create('CPU')
  }
}

/** Wall-clock deadline, independent of camera frames or requestAnimationFrame. */
export function captureDeadline(maxMs: number, finish: () => void) {
  const timer = window.setTimeout(finish, maxMs)
  return () => window.clearTimeout(timer)
}
