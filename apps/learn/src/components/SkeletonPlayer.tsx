import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from 'lucide-react'
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
   */
  fitToFrame?: boolean
  /** Force one skeleton colour — see drawHands. Used by the reference player. */
  colorOverride?: string
}

const SPEEDS = [1, 0.75, 0.5, 0.25]

/** Replays a recorded landmark sequence on a canvas — no video involved. */
export function SkeletonPlayer({
  frames,
  videoWidth,
  videoHeight,
  mirrored = true,
  fitToFrame = true,
  colorOverride,
}: SkeletonPlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)
  const startedAtRef = useRef(0)
  const offsetRef = useRef(0) // playback position while paused / at seek
  const lastTRef = useRef(0)
  const lastUiPushRef = useRef(0)
  const renderAtRef = useRef<(t: number) => void>(() => {})

  const [playing, setPlaying] = useState(true)
  const [speedIndex, setSpeedIndex] = useState(0)
  const speed = SPEEDS[speedIndex] ?? 1
  const [timeMs, setTimeMs] = useState(0)
  const durationMs = Math.max(frames[frames.length - 1]?.timestampMs ?? 0, 1)
  const fit = useMemo(() => (fitToFrame ? fitFor(frames, 0.85) : undefined), [frames, fitToFrame])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    let idx = 0
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
      if (frame) drawHands(ctx, frame.hands, fit, colorOverride)
    }
    renderAtRef.current = renderAt

    if (!playing) {
      renderAt(offsetRef.current)
      return
    }

    startedAtRef.current = performance.now() - offsetRef.current / speed
    renderAt(offsetRef.current % durationMs)
    const loop = () => {
      const t = ((performance.now() - startedAtRef.current) * speed) % durationMs
      renderAt(t)
      if (performance.now() - lastUiPushRef.current > 60) {
        lastUiPushRef.current = performance.now()
        setTimeMs(t)
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [playing, frames, durationMs, fit, speed, colorOverride])

  function togglePlay() {
    if (playing) offsetRef.current = lastTRef.current
    setPlaying(!playing)
  }

  function restart() {
    seek(0)
    if (!playing) setPlaying(true)
  }

  function seek(t: number) {
    offsetRef.current = t
    if (playing) {
      startedAtRef.current = performance.now() - t / speed
    } else {
      renderAtRef.current(t)
    }
    setTimeMs(t)
  }

  function stepFrame(forward: boolean) {
    if (playing) setPlaying(false)
    const currentT = lastTRef.current
    let targetIdx = frames.findIndex((f) => f.timestampMs >= currentT)
    if (targetIdx === -1) targetIdx = 0
    const nextIdx = forward
      ? Math.min(frames.length - 1, targetIdx + 1)
      : Math.max(0, targetIdx - 1)
    const nextT = frames[nextIdx]?.timestampMs ?? 0
    seek(nextT)
  }

  function cycleSpeed() {
    setSpeedIndex((prev) => (prev + 1) % SPEEDS.length)
  }

  return (
    <div className="skeleton-player aww-skeleton-player">
      <div className="aww-viewfinder-grid" aria-hidden="true">
        <div className="reticle-corner tl" />
        <div className="reticle-corner tr" />
        <div className="reticle-corner bl" />
        <div className="reticle-corner br" />
      </div>

      <div className="aww-skeleton-canvas-wrap">
        <canvas
          ref={canvasRef}
          width={videoWidth}
          height={videoHeight}
          className={mirrored ? 'mirrored' : undefined}
        />
      </div>

      <div className="player-controls aww-player-controls">
        <button
          className="player-btn aww-player-play-btn"
          onClick={togglePlay}
          aria-label={playing ? 'Pause' : 'Play'}
          title={playing ? 'Pause' : 'Play'}
        >
          {playing ? <Pause size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}
        </button>

        <button
          className="player-btn aww-player-restart-btn"
          onClick={restart}
          aria-label="Restart playback"
          title="Restart"
        >
          <RotateCcw size={14} aria-hidden="true" />
        </button>

        <button
          className="player-btn aww-player-step-btn"
          onClick={() => stepFrame(false)}
          aria-label="Previous frame"
          title="Previous frame"
        >
          <ChevronLeft size={15} aria-hidden="true" />
        </button>

        <button
          className="player-btn aww-player-step-btn"
          onClick={() => stepFrame(true)}
          aria-label="Next frame"
          title="Next frame"
        >
          <ChevronRight size={15} aria-hidden="true" />
        </button>

        <button
          className="player-btn aww-player-speed-btn"
          onClick={cycleSpeed}
          aria-label={`Playback speed ${speed}x`}
          title="Click to cycle speed"
        >
          <span>{speed === 1 ? '1.0x' : `${speed}x`}</span>
        </button>

        <div className="aww-scrubber-wrap">
          <input
            type="range"
            min={0}
            max={durationMs}
            value={Math.round(timeMs)}
            onChange={(e) => seek(Number(e.target.value))}
            aria-label="Scrub reference playback"
            className="aww-player-range"
            style={{
              '--seek-pct': `${(timeMs / durationMs) * 100}%`,
            } as React.CSSProperties}
          />
        </div>

        <span className="player-time aww-player-time">
          {(timeMs / 1000).toFixed(1)} / {(durationMs / 1000).toFixed(1)}s
        </span>
      </div>
    </div>
  )
}
