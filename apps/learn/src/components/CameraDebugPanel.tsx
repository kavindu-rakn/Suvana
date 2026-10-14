import { useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { cameraDebugEnabled, cameraDebugSnapshot, subscribeCameraDebug } from '../vision/cameraDebug'
import './CameraDebugPanel.css'

export function CameraDebugPanel() {
  const events = useSyncExternalStore(subscribeCameraDebug, cameraDebugSnapshot)
  if (!cameraDebugEnabled()) return null
  return createPortal(
    <aside className="camera-debug" aria-label="Camera debug events">
      <strong>Camera events · device time · newest first</strong>
      <ol>
        {[...events].reverse().map((entry, i) => (
          <li key={events.length - i}>
            {entry.time} {entry.event} · hidden={String(entry.hidden)} {entry.detail}
          </li>
        ))}
      </ol>
    </aside>, document.body,
  )
}
