import { useState } from 'react'
import type { ReactNode, RefObject } from 'react'
import { ArrowLeftRight, Ghost, RotateCcw, Video, VideoOff } from 'lucide-react'
import type { TrackingStatus } from '../vision/useHandTracking'

interface CameraStageProps {
  videoRef: RefObject<HTMLVideoElement | null>
  canvasRef: RefObject<HTMLCanvasElement | null>
  ghostCanvasRef?: RefObject<HTMLCanvasElement | null>
  status: TrackingStatus
  error: string
  onStart: () => void
  onStop?: () => void
  idleHint: string
  /** Reference replay, shown as a picture-in-picture inside the stage. */
  pip?: ReactNode
  /** False while landmark detection is paused with the camera still live. */
  inferring?: boolean
  /** Replaces the plain "Start camera" placeholder while the camera is idle. */
  intro?: ReactNode
  /** Extra overlays rendered above the video (countdown, REC badge, …). */
  children?: ReactNode
  /** Ghost mode active status */
  ghostActive?: boolean
  /** Toggle ghost overlay */
  onToggleGhost?: () => void
  /** Whether ghost mode is available for current sign */
  ghostAvailable?: boolean
}

/** Mirrored webcam view + landmark overlay canvas + ghost reference overlay. */
export function CameraStage({
  videoRef,
  canvasRef,
  ghostCanvasRef,
  status,
  error,
  onStart,
  onStop,
  idleHint,
  pip,
  inferring = true,
  intro,
  children,
  ghostActive = false,
  onToggleGhost,
  ghostAvailable = false,
}: CameraStageProps) {
  const [swapped, setSwapped] = useState(false)

  return (
    <div className={swapped ? 'camera-stage camera-stage--swapped aww-camera-stage' : 'camera-stage aww-camera-stage'}>
      <div className="stage-live">
        <div className="aww-viewfinder-grid" aria-hidden="true">
          <div className="reticle-corner tl" />
          <div className="reticle-corner tr" />
          <div className="reticle-corner bl" />
          <div className="reticle-corner br" />
        </div>
        <video ref={videoRef} playsInline muted />
        <canvas
          ref={canvasRef}
          className={status === 'running' && !inferring ? 'tracking-held' : undefined}
        />
        {/* Ghost Reference Skeleton Overlay */}
        {ghostCanvasRef && (
          <canvas
            ref={ghostCanvasRef}
            className={`aww-ghost-canvas ${ghostActive ? 'is-active' : ''}`}
            aria-hidden="true"
          />
        )}
      </div>

      {pip && <div className="stage-pip">{pip}</div>}

      {/* Top stage utility deck */}
      {status === 'running' && (
        <div className="aww-stage-top-controls">
          {/* Ghost Mode Switch (Lucide Ghost icon without text) */}
          {ghostAvailable && onToggleGhost && (
            <button
              type="button"
              className={`aww-stage-icon-btn aww-ghost-toggle ${ghostActive ? 'is-active' : ''}`}
              onClick={onToggleGhost}
              aria-pressed={ghostActive}
              aria-label="Toggle reference ghost overlay (M)"
              title={ghostActive ? 'Turn off ghost overlay (M)' : 'Overlay reference skeleton on camera (M)'}
            >
              <Ghost size={16} aria-hidden="true" />
            </button>
          )}

          {/* Camera Power Toggle */}
          {onStop && (
            <button
              type="button"
              className="aww-stage-icon-btn aww-cam-power-btn"
              onClick={onStop}
              aria-label="Turn off camera"
              title="Turn off camera"
            >
              <VideoOff size={16} aria-hidden="true" />
            </button>
          )}

          {/* Picture-in-picture swap button */}
          {pip && (
            <button
              type="button"
              className="stage-swap aww-stage-icon-btn"
              onClick={() => setSwapped((s) => !s)}
              aria-pressed={swapped}
              aria-label={swapped ? 'Show my camera full size' : 'Show reference sign full size'}
              title={swapped ? 'Show camera full size' : 'Show reference full size'}
            >
              <ArrowLeftRight size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      {children}

      {status !== 'running' && (
        <div className="camera-placeholder">
          {status === 'error' ? (
            <>
              <p className="camera-error">{error}</p>
              <button className="btn" onClick={onStart}>
                <RotateCcw size={14} style={{ marginRight: '6px' }} />
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
                <Video size={16} style={{ marginRight: '6px' }} />
                {status === 'starting' ? 'Starting…' : 'Start camera'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
