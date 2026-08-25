import { useCallback, useEffect, useRef, useState } from 'react'
import { useHandTracking } from './useHandTracking'
import type { HandFrame } from './types'

export type CapturePhase = 'idle' | 'countdown' | 'recording'

/** A finished take: buffered frames plus the geometry they were captured at. */
export interface CapturedTake {
  frames: HandFrame[]
  durationMs: number
  videoWidth: number
  videoHeight: number
  /**
   * Absolute `performance.now()` capture time of the take's final frame, or
   * null if no frame arrived. Buffered frames carry take-relative timestamps,
   * so this is the only surviving link to the monotonic clock — it is where the
   * feedback-latency measurement starts (see metrics/latency.ts).
   */
  lastFrameAt: number | null
}

/**
 * Countdown → capture → hand back a take. Owns the tracking hook so frames are
 * buffered with timestamps relative to the start of the take.
 *
 * Extracted from the Practice/Record views' shared flow. Those two still carry
 * their own copies — migrating them is mechanical but needs a camera to verify,
 * so it is deliberately left for a session where that can be tested.
 */
export function useSignCapture(onCaptured: (take: CapturedTake) => void, countdownSeconds = 3) {
  const [phase, setPhaseState] = useState<CapturePhase>('idle')
  const [count, setCount] = useState(countdownSeconds)
  const [elapsedMs, setElapsedMs] = useState(0)

  const phaseRef = useRef<CapturePhase>('idle')
  const setPhase = (p: CapturePhase) => {
    phaseRef.current = p
    setPhaseState(p)
  }
  const framesRef = useRef<HandFrame[]>([])
  const startTsRef = useRef<number | null>(null)
  const lastFrameAtRef = useRef<number | null>(null)
  const countdownRef = useRef(0)
  const maxMsRef = useRef(4000)
  const onCapturedRef = useRef(onCaptured)
  onCapturedRef.current = onCaptured
  // Lets the frame callback end a take without depending on `finish`, which is
  // declared after the tracking hook that the callback belongs to.
  const finishRef = useRef<() => void>(() => {})

  const tracking = useHandTracking((frame) => {
    if (phaseRef.current !== 'recording') return
    if (startTsRef.current === null) startTsRef.current = frame.timestampMs
    const rel = frame.timestampMs - startTsRef.current
    lastFrameAtRef.current = frame.timestampMs
    framesRef.current.push({ ...frame, timestampMs: rel })
    setElapsedMs(rel)
    if (rel >= maxMsRef.current) finishRef.current()
  })
  const { videoRef, status } = tracking

  const finish = useCallback(() => {
    if (phaseRef.current !== 'recording') return
    const frames = framesRef.current
    framesRef.current = []
    setPhase('idle')
    const durationMs = Math.max(frames[frames.length - 1]?.timestampMs ?? 0, 1)
    const video = videoRef.current
    onCapturedRef.current({
      frames,
      durationMs,
      videoWidth: video?.videoWidth || 1280,
      videoHeight: video?.videoHeight || 720,
      lastFrameAt: lastFrameAtRef.current,
    })
  }, [videoRef])
  finishRef.current = finish

  /** Start the countdown, then capture for at most `maxMs`. */
  const begin = useCallback(
    (maxMs: number) => {
      if (status !== 'running') return
      maxMsRef.current = maxMs
      setCount(countdownSeconds)
      setPhase('countdown')
      window.clearInterval(countdownRef.current)
      countdownRef.current = window.setInterval(() => {
        setCount((c) => {
          if (c > 1) return c - 1
          window.clearInterval(countdownRef.current)
          framesRef.current = []
          startTsRef.current = null
          lastFrameAtRef.current = null
          setElapsedMs(0)
          setPhase('recording')
          return 0
        })
      }, 1000)
    },
    [countdownSeconds, status],
  )

  const cancel = useCallback(() => {
    window.clearInterval(countdownRef.current)
    framesRef.current = []
    setPhase('idle')
  }, [])

  // Abandon a take if the camera stops midway (stopped, unplugged, permission lost).
  useEffect(() => {
    if (status !== 'running' && phaseRef.current !== 'idle') {
      window.clearInterval(countdownRef.current)
      framesRef.current = []
      setPhase('idle')
    }
  }, [status])

  useEffect(() => () => window.clearInterval(countdownRef.current), [])

  return { tracking, phase, count, elapsedMs, begin, finish, cancel }
}
