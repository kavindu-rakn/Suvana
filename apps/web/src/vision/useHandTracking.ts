import { useCallback, useEffect, useRef, useState } from 'react'
import { getHandLandmarker } from './handTracker'
import { drawHands } from './drawing'
import { toHandFrame } from './types'
import type { HandFrame, TrackedHand } from './types'

export type TrackingStatus = 'idle' | 'starting' | 'running' | 'error'

export interface TrackingStats {
  fps: number
  inferenceMs: number
  width: number
  height: number
}

function describeError(e: unknown): string {
  // The tracking engine is a lazily-imported chunk, so a flaky connection or a
  // stale cache after a redeploy can fail the import rather than the camera.
  if (e instanceof Error && /dynamically imported module|Importing a module script failed/i.test(e.message)) {
    return 'Could not load the hand-tracking engine. Check your connection and try again — if you have just reloaded, refresh the page once more.'
  }
  if (e instanceof DOMException) {
    switch (e.name) {
      case 'NotAllowedError':
        return 'Camera permission was denied. Allow camera access in the browser and try again.'
      case 'NotFoundError':
        return 'No camera was found on this device.'
      case 'NotReadableError':
        return 'The camera is already in use by another application.'
    }
  }
  return e instanceof Error ? e.message : 'Something went wrong while starting the camera.'
}

/**
 * Owns the webcam stream + per-frame hand detection + skeleton overlay.
 * Views subscribe to frames via `onFrame` (e.g. the recorder buffers them).
 * The heavy landmarker itself is shared app-wide (see handTracker.ts).
 */
export function useHandTracking(onFrame?: (frame: HandFrame) => void) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef(0)
  // Guards the frame loop. processFrame awaits the landmarker, so a stop() that
  // lands during that await would otherwise be followed by the continuation
  // scheduling a fresh rAF that nothing cancels — a loop that survives stop().
  const activeRef = useRef(false)
  const lastVideoTimeRef = useRef(-1)
  const emaRef = useRef({ fps: 0, inferenceMs: 0, lastFrameAt: 0, lastUiPush: 0 })
  const onFrameRef = useRef(onFrame)
  onFrameRef.current = onFrame

  const [status, setStatus] = useState<TrackingStatus>('idle')
  const [error, setError] = useState('')
  const [stats, setStats] = useState<TrackingStats | null>(null)
  const [hands, setHands] = useState<TrackedHand[]>([])
  /** Whether landmark detection is currently running. See pause(). */
  const [inferring, setInferring] = useState(false)

  const processFrame = useCallback(async () => {
    if (!activeRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    const landmarker = await getHandLandmarker()
    if (!activeRef.current) return // stopped while we were awaiting the landmarker

    // Only run inference when the camera has produced a new frame.
    if (video.readyState >= 2 && video.currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = video.currentTime

      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
      }

      const t0 = performance.now()
      const result = landmarker.detectForVideo(video, t0)
      const t1 = performance.now()
      const frame = toHandFrame(result, t0)

      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        drawHands(ctx, frame.hands)
      }

      onFrameRef.current?.(frame)

      // Smoothed stats; pushed to React state at ~4 Hz to avoid re-render churn.
      const ema = emaRef.current
      if (ema.lastFrameAt > 0) {
        const instFps = 1000 / (t0 - ema.lastFrameAt)
        ema.fps = ema.fps === 0 ? instFps : ema.fps * 0.9 + instFps * 0.1
      }
      ema.lastFrameAt = t0
      const inferenceMs = t1 - t0
      ema.inferenceMs =
        ema.inferenceMs === 0 ? inferenceMs : ema.inferenceMs * 0.9 + inferenceMs * 0.1

      if (t1 - ema.lastUiPush > 250) {
        ema.lastUiPush = t1
        setStats({
          fps: ema.fps,
          inferenceMs: ema.inferenceMs,
          width: video.videoWidth,
          height: video.videoHeight,
        })
        setHands(frame.hands)
      }
    }

    if (!activeRef.current) return
    rafRef.current = requestAnimationFrame(() => void processFrame())
  }, [])

  const start = useCallback(async () => {
    setStatus('starting')
    setError('')

    // Kick off model init and camera permission in parallel — together they
    // dominate startup time. The landmarker stays cached across attempts.
    const landmarkerPromise = getHandLandmarker()

    let stream: MediaStream | null = null
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      })
      await landmarkerPromise
      streamRef.current = stream

      const video = videoRef.current
      if (!video) throw new Error('Video element is not mounted.')
      video.srcObject = stream
      await video.play()

      lastVideoTimeRef.current = -1
      emaRef.current = { fps: 0, inferenceMs: 0, lastFrameAt: 0, lastUiPush: 0 }
      setStatus('running')
      activeRef.current = true
      setInferring(true)
      rafRef.current = requestAnimationFrame(() => void processFrame())
    } catch (e) {
      activeRef.current = false
      stream?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      landmarkerPromise.catch(() => {}) // camera may have failed first; silence the pair
      setError(describeError(e))
      setStatus('error')
    }
  }, [processFrame])

  /**
   * Stop detecting, keep the camera.
   *
   * Inference is the expensive thing on this page — 10–25 ms of main thread per
   * frame on low-end hardware — and there are stretches where nothing consumes
   * it: while the learner reads a score, or reviews a take they just recorded.
   * Running it there costs frame budget at exactly the moment something else
   * wants to animate smoothly.
   *
   * The MediaStream and `video.srcObject` are deliberately left alone, so the
   * self-view keeps playing and resume() costs nothing — no getUserMedia
   * round-trip, no model reload. The overlay is left painted rather than
   * cleared, dimmed by CSS, so the last skeleton reads as frozen rather than
   * broken.
   */
  const pause = useCallback(() => {
    if (!activeRef.current) return
    activeRef.current = false
    cancelAnimationFrame(rafRef.current)
    setInferring(false)
  }, [])

  /** Resume detection. A no-op unless a stream is live, so callers can fire it
   *  on any state change without guarding. */
  const resume = useCallback(() => {
    if (activeRef.current || !streamRef.current) return
    // The video has advanced while we were away, and the smoothed stats would
    // otherwise average across the gap.
    lastVideoTimeRef.current = -1
    emaRef.current = { fps: 0, inferenceMs: 0, lastFrameAt: 0, lastUiPush: 0 }
    activeRef.current = true
    setInferring(true)
    rafRef.current = requestAnimationFrame(() => void processFrame())
  }, [processFrame])

  const stop = useCallback(() => {
    activeRef.current = false
    setInferring(false)
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    const video = videoRef.current
    if (video) video.srcObject = null
    const canvas = canvasRef.current
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
    setStatus('idle')
    setStats(null)
    setHands([])
  }, [])

  // Release the camera on unmount. The landmarker is shared, so it stays up.
  useEffect(() => {
    return () => {
      activeRef.current = false
      cancelAnimationFrame(rafRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  return { videoRef, canvasRef, status, error, stats, hands, inferring, start, stop, pause, resume }
}
