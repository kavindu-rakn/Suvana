import { useEffect, useMemo, useRef, useState } from 'react'
import { drawHands, fitFor } from '../vision/drawing'
import type { HandFrame } from '../vision/types'

interface SkeletonPlayerProps {
  frames: HandFrame[]
  videoWidth: number
  videoHeight: number
  /** Mirror like the live self-view (default) so learners can imitate directly. */
  mirrored?: boolean
  /**
   * Centre and zoom the whole clip to fill the frame, discarding where the
   * signer happened to stand relative to their camera.
   *
   * On by default, because that framing is not part of the sign and the scorer
   * already ignores it: score.ts normalises both attempt and reference before
   * comparing. Drawing them raw showed a learner position and size differences
   * that had no bearing on their score, while giving no help with the ones that
   * did. Motion within the clip is preserved — the fit is computed once for the
   * whole sequence, not per frame.
   */
  fitToFrame?: boolean
}

/** Replays a recorded landmark sequence on a canvas — no video involved. */
export function SkeletonPlayer({
  frames,
  videoWidth,
  videoHeight,
  mirrored = true,
  fitToFrame = true,
}: SkeletonPlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)
  const startedAtRef = useRef(0)
  const offsetRef = useRef(0) // playback position while paused / at seek
  const lastTRef = useRef(0)
  const lastUiPushRef = useRef(0)
  const renderAtRef = useRef<(t: number) => void>(() => {})

  const [playing, setPlaying] = useState(true)
  const [timeMs, setTimeMs] = useState(0)
  const durationMs = Math.max(frames[frames.length - 1]?.timestampMs ?? 0, 1)
  const fit = useMemo(() => (fitToFrame ? fitFor(frames) : undefined), [frames, fitToFrame])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    let idx = 0
    // Recordings run at ~25 fps but rAF fires at the display's refresh rate, so
    // most ticks would repaint pixel-identical output. Skipping those is the
    // difference between two idle canvases costing something and nothing.
    let lastDrawn = -1
    const renderAt = (t: number) => {
      if (frames[idx] && frames[idx].timestampMs > t) {
        idx = 0 // looped back
        lastDrawn = -1
      }
      while (idx + 1 < frames.length && frames[idx + 1].timestampMs <= t) idx++
      lastTRef.current = t
      if (idx === lastDrawn) return
      lastDrawn = idx
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const frame = frames[idx]
      if (frame) drawHands(ctx, frame.hands, fit)
    }
    renderAtRef.current = renderAt

    if (!playing) {
      renderAt(offsetRef.current)
      return
    }

    startedAtRef.current = performance.now() - offsetRef.current
    // Paint immediately: rAF is suspended in hidden/occluded tabs, and the
    // first frame should be visible as soon as the player mounts.
    renderAt(offsetRef.current % durationMs)
    const loop = () => {
      const t = (performance.now() - startedAtRef.current) % durationMs
      renderAt(t)
      if (performance.now() - lastUiPushRef.current > 100) {
        lastUiPushRef.current = performance.now()
        setTimeMs(t)
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [playing, frames, durationMs, fit])

  function togglePlay() {
    if (playing) offsetRef.current = lastTRef.current
    setPlaying(!playing)
  }

  function seek(t: number) {
    offsetRef.current = t
    if (playing) {
      startedAtRef.current = performance.now() - t
    } else {
      renderAtRef.current(t)
    }
    setTimeMs(t)
  }

  return (
    <div className="skeleton-player">
      <canvas
        ref={canvasRef}
        width={videoWidth}
        height={videoHeight}
        className={mirrored ? 'mirrored' : undefined}
      />
      <div className="player-controls">
        <button className="btn btn-ghost" onClick={togglePlay}>
          {playing ? 'Pause' : 'Play'}
        </button>
        <input
          type="range"
          min={0}
          max={durationMs}
          value={Math.round(timeMs)}
          onChange={(e) => seek(Number(e.target.value))}
        />
        <span className="player-time">
          {(timeMs / 1000).toFixed(1)} / {(durationMs / 1000).toFixed(1)} s
        </span>
      </div>
    </div>
  )
}
