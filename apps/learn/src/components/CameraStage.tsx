import { useState } from 'react'
import type { ReactNode, RefObject } from 'react'
import type { TrackingStatus } from '../vision/useHandTracking'

interface CameraStageProps {
  videoRef: RefObject<HTMLVideoElement | null>
  canvasRef: RefObject<HTMLCanvasElement | null>
  status: TrackingStatus
  error: string
  onStart: () => void
  idleHint: string
  /**
   * Reference replay, shown as a picture-in-picture inside the stage. On a
   * phone this is the difference between the interaction working and not: the
   * learner has to see themselves and the sign they are copying at the same
   * time, and stacked panels put one of them off screen.
   */
  pip?: ReactNode
  /**
   * False while landmark detection is paused with the camera still live — the
   * overlay holds its last skeleton and dims instead of going blank.
   */
  inferring?: boolean
  /**
   * Replaces the plain "Start camera" placeholder while the camera is idle.
   * The caller supplies its own copy and start button. `starting` and `error`
   * states still use the built-in placeholder.
   */
  intro?: ReactNode
  /** Extra overlays rendered above the video (countdown, REC badge, …). */
  children?: ReactNode
}

/** Mirrored webcam view + landmark overlay canvas, shared by Practice and Record. */
export function CameraStage({
  videoRef,
  canvasRef,
  status,
  error,
  onStart,
  idleHint,
  pip,
  inferring = true,
  intro,
  children,
}: CameraStageProps) {
  // Which layer is full-bleed. Purely presentational, so it lives here rather
  // than in every view that mounts a stage.
  const [swapped, setSwapped] = useState(false)

  return (
    <div className={swapped ? 'camera-stage camera-stage--swapped' : 'camera-stage'}>
      <div className="stage-live">
        <video ref={videoRef} playsInline muted />
        <canvas
          ref={canvasRef}
          className={status === 'running' && !inferring ? 'tracking-held' : undefined}
        />
      </div>

      {pip && <div className="stage-pip">{pip}</div>}

      {pip && (
        // Anchored to the stage, not to the picture-in-picture: it stays in the
        // same corner whichever view is large, so switching is one predictable
        // tap rather than a target that moves when you use it.
        //
        // A visible control, not a hidden gesture on the panel — a tap target
        // only sighted mouse users could discover would strand keyboard and
        // screen-reader users.
        <button
          type="button"
          className="stage-swap"
          onClick={() => setSwapped((s) => !s)}
          aria-pressed={swapped}
          aria-label={swapped ? 'Show my camera full size' : 'Show the reference sign full size'}
          title={swapped ? 'Show my camera full size' : 'Show the reference full size'}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M4 8h11l-3-3M20 16H9l3 3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}

      {children}

      {status !== 'running' && (
        <div className="camera-placeholder">
          {status === 'error' ? (
            <>
              <p className="camera-error">{error}</p>
              <button className="btn" onClick={onStart}>
                Try again
              </button>
            </>
          ) : status !== 'starting' && intro ? (
            intro
          ) : (
            <>
              <p className="camera-hint">
                {status === 'starting' ? 'Loading hand tracker and camera…' : idleHint}
              </p>
              <button className="btn" onClick={onStart} disabled={status === 'starting'}>
                {status === 'starting' ? 'Starting…' : 'Start camera'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
