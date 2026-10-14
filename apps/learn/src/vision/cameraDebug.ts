export interface CameraDebugEvent {
  time: string
  event: string
  hidden: boolean
  detail: string
}

const MAX_EVENTS = 80
let events: CameraDebugEvent[] = []
const listeners = new Set<() => void>()

export function cameraDebugEnabled(): boolean {
  return typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('camdebug') === '1'
}

/** Opt-in, bounded, in-memory device-time log. No recording or network writes. */
export function recordCameraEvent(event: string, detail = '') {
  if (!cameraDebugEnabled()) return
  const now = new Date()
  const time = `${now.toLocaleTimeString('en-GB', { hour12: false })}.${String(now.getMilliseconds()).padStart(3, '0')}`
  events = [...events.slice(-(MAX_EVENTS - 1)), { time, event, hidden: document.hidden, detail }]
  listeners.forEach((notify) => notify())
}

export function cameraDebugSnapshot() { return events }
export function subscribeCameraDebug(notify: () => void) {
  listeners.add(notify)
  return () => { listeners.delete(notify) }
}
