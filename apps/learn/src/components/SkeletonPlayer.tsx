import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from 'lucide-react'
import { drawHands, fitFor, interpolateHands } from '../vision/drawing'
import type { HandFrame } from '../vision/types'

interface SkeletonPlayerProps {
  frames: HandFrame[]
  videoWidth: number
  videoHeight: number
  /** Mirror like the live self-view (default) so learners can imitate directly. */
  mirrored?: boolean
  /**
   * Start zoomed: centre and zoom the whole clip to fill the frame. Off by
   * default, so the skeleton shows where the hands were in the original video
   * frame and how big the movement was; the learner can switch with "Zoom to
   * hands".
   */
  fitToFrame?: boolean
  /** Force one skeleton colour — see drawHands. Used by the reference player. */
  colorOverride?: string
  /**
   * Play the first SLOW_LOOPS loops of each clip at SLOW_SPEED, then 1x, so a
   * learner sees the movement slowly before full speed. Choosing a speed ends it.
   */
  slowStart?: boolean
  /** Watch keeps its slow start until the learner chooses another speed. */
  autoSpeedUp?: boolean
}

const SPEEDS = [0.25, 0.5, 0.75, 1]
const SLOW_SPEED = 0.5
const SLOW_LOOPS = 2
/**
 * Blend between recorded frames only when they are this close together. A
 * longer gap means tracking dropped out, and a blend would invent a path
 * across it. Untuned.
 */
const MAX_BLEND_GAP_MS = 200

/** Replays a recorded landmark sequence on a canvas — no video involved. */
export function SkeletonPlayer({
  frames,
  videoWidth,
  videoHeight,
  mirrored = true,
  fitToFrame = false,
  colorOverride,
  slowStart = true,
  autoSpeedUp = true,
}: SkeletonPlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)
  const startedAtRef = useRef(0)
  const offsetRef = useRef(0) // playback position while paused / at seek
  const lastTRef = useRef(0)
  const lastUiPushRef = useRef(0)
  const renderAtRef = useRef<(t: number) => void>(() => {})

  const prevTRef = useRef(0) // last rendered position, to count loop wraps
  const loopsRef = useRef(0)
  const autoSpeedRef = useRef(slowStart && autoSpeedUp) // still on the automatic slow start

  const [playing, setPlaying] = useState(true)
  const [speed, setSpeed] = useState(slowStart ? SLOW_SPEED : 1)
  const [zoomed, setZoomed] = useState(fitToFrame)
  const [timeMs, setTimeMs] = useState(0)
  const durationMs = Math.max(frames[frames.length - 1]?.timestampMs ?? 0, 1)
  const fit = useMemo(() => (zoomed ? fitFor(frames, 0.85) : undefined), [frames, zoomed])

  // A new clip starts slow again, from the beginning.
  useEffect(() => {
    autoSpeedRef.current = slowStart && autoSpeedUp
    loopsRef.current = 0
    prevTRef.current = 0
    offsetRef.current = 0
    setSpeed(slowStart ? SLOW_SPEED : 1)
  }, [frames, slowStart, autoSpeedUp])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    let idx = 0
    const renderAt = (t: number) => {
      if (frames[idx] && frames[idx].timestampMs > t) idx = 0 // looped back
      while (idx + 1 < frames.length && frames[idx + 1].timestampMs <= t) idx++
      lastTRef.current = t
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const frame = frames[idx]
      if (!frame) return
      // Draw the pose between this frame and the next, so playback stays
      // smooth when slowed down (a 25 fps clip at 0.5x would otherwise show
      // ~12 pictures a second). Display only.
      const next = frames[idx + 1]
      const gap = next ? next.timestampMs - frame.timestampMs : 0
      const hands = next && gap > 0 && gap <= MAX_BLEND_GAP_MS
        ? interpolateHands(frame.hands, next.hands, (t - frame.timestampMs) / gap)
        : frame.hands
      drawHands(ctx, hands, fit, colorOverride)
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
      if (t < prevTRef.current) {
        loopsRef.current++
        if (autoSpeedRef.current && loopsRef.current >= SLOW_LOOPS) {
          // End of the slow start: continue from here at 1x.
          autoSpeedRef.current = false
          offsetRef.current = t
          prevTRef.current = t
          setSpeed(1)
          return
        }
      }
      prevTRef.current = t
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
    prevTRef.current = t // a seek back is not a loop
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

  function chooseSpeed(next: number) {
    autoSpeedRef.current = false
    // Keep the position: the play effect restarts from offsetRef at the new speed.
    if (playing) offsetRef.current = lastTRef.current
    prevTRef.current = offsetRef.current
    setSpeed(next)
  }

  return (
    <div className="skeleton-player aww-skeleton-player" data-speed={speed}>

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
          className={[mirrored ? 'mirrored' : '', zoomed ? '' : 'is-raw'].filter(Boolean).join(' ') || undefined}
        />
        <div className="aww-player-meta">
          <div className="aww-player-labels">
            <span className="aww-frame-caption">
              {zoomed ? 'Zoomed to the hands' : 'Position in the original video frame'}
            </span>
            {mirrored && <span className="aww-mirror-chip">Mirrored: copy it like a mirror</span>}
          </div>
          <button
            type="button"
            className="aww-zoom-toggle"
            aria-pressed={zoomed}
            onClick={() => setZoomed((z) => !z)}
          >
            Zoom to hands
          </button>
        </div>
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

        <div className="aww-speed-group" role="group" aria-label="Playback speed">
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              className="aww-speed-opt"
              aria-pressed={speed === s}
              onClick={() => chooseSpeed(s)}
            >
              {`${s}x`}
            </button>
          ))}
        </div>

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
