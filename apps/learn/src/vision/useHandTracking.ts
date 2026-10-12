import { useCallback, useEffect, useRef, useState } from 'react'
import { getHandLandmarker } from './handTracker'
import { drawHands } from './drawing'
import { toHandFrame } from './types'
import type { HandFrame, TrackedHand } from './types'
import { releaseStream, watchStream } from './cameraLifecycle'

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
  const generationRef = useRef(0)
  const loopRef = useRef(0)
  const inferenceWantedRef = useRef(false)
  const restoreRef = useRef(false)
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

  const release = useCallback(() => {
    generationRef.current++
    loopRef.current++
    activeRef.current = false
    cancelAnimationFrame(rafRef.current)
    releaseStream(streamRef.current)
    streamRef.current = null
    const video = videoRef.current
    if (video) video.srcObject = null
  }, [])

  const fail = useCallback((message: string) => {
    release()
    setInferring(false)
    setStats(null)
    setHands([])
    setError(message)
    setStatus('error')
  }, [release])

  const processFrame = useCallback(async () => {
    if (!activeRef.current) return
    const loop = loopRef.current
    try {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas) throw new Error('Camera view is unavailable. Restart the camera.')
      const landmarker = await getHandLandmarker()
      if (!activeRef.current || loop !== loopRef.current) return

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

      if (!activeRef.current || loop !== loopRef.current) return
      rafRef.current = requestAnimationFrame(() => void processFrame())
    } catch (e) {
      if (loop === loopRef.current) fail(describeError(e))
    }
  }, [fail])

  const start = useCallback(async () => {
    release()
    restoreRef.current = false
    inferenceWantedRef.current = true
    const generation = generationRef.current
    setStatus('starting')
    setError('')
    setInferring(false)
    setStats(null)
    setHands([])

    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      fail('Camera needs HTTPS')
      return
    }

    // Kick off model init and camera permission in parallel — together they
    // dominate startup time. The landmarker stays cached across attempts.
    try {
      const streamPromise = navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      }).then((stream) => {
        if (generation !== generationRef.current) {
          releaseStream(stream)
          throw new Error('Camera start cancelled.')
        }
        streamRef.current = stream
        watchStream(stream, () => fail('Camera disconnected'))
        return stream
      })
      const [stream] = await Promise.all([streamPromise, getHandLandmarker()])
      if (generation !== generationRef.current) return

      const video = videoRef.current
      if (!video) throw new Error('Video element is not mounted.')
      video.srcObject = stream
      await video.play()
      if (generation !== generationRef.current) return

      lastVideoTimeRef.current = -1
      emaRef.current = { fps: 0, inferenceMs: 0, lastFrameAt: 0, lastUiPush: 0 }
      setStatus('running')
      activeRef.current = !document.hidden && inferenceWantedRef.current
      setInferring(activeRef.current)
      if (activeRef.current) rafRef.current = requestAnimationFrame(() => void processFrame())
    } catch (e) {
      if (generation === generationRef.current) fail(describeError(e))
    }
  }, [processFrame, release, fail])

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
    inferenceWantedRef.current = false
    loopRef.current++
    if (!activeRef.current) return
    activeRef.current = false
    cancelAnimationFrame(rafRef.current)
    setInferring(false)
  }, [])

  /** Resume detection. A no-op unless a stream is live, so callers can fire it
   *  on any state change without guarding. */
  const resume = useCallback(() => {
    inferenceWantedRef.current = true
    if (document.hidden) return
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
    restoreRef.current = false
    inferenceWantedRef.current = false
    release()
    setInferring(false)
    const video = videoRef.current
    if (video) video.srcObject = null
    const canvas = canvasRef.current
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
    setStatus('idle')
    setError('')
    setStats(null)
    setHands([])
  }, [release])

  // Re-attach active stream and resume rAF if the video element mounts or changes while running.
  useEffect(() => {
    const video = videoRef.current
    if (status === 'running' && streamRef.current && video && video.srcObject !== streamRef.current) {
      video.srcObject = streamRef.current
      void video.play().catch((e) => fail(describeError(e)))
      if (inferenceWantedRef.current) resume()
    }
  })

  // Safari may pause video on app switches or restore an ended stream from bfcache.
  useEffect(() => {
    const restore = () => {
      if (document.hidden) return
      const stream = streamRef.current
      if (!stream && !restoreRef.current) return
      if (!stream || stream.getVideoTracks().some((track) => track.readyState === 'ended')) {
        void start()
        return
      }
      const generation = generationRef.current
      const video = videoRef.current
      if (!video) return
      video.srcObject = stream
      void video.play().then(() => {
        if (generation === generationRef.current && inferenceWantedRef.current) resume()
      }).catch((e) => {
        if (generation === generationRef.current) fail(describeError(e))
      })
    }
    const visibility = () => {
      if (!document.hidden) return restore()
      restoreRef.current = !!streamRef.current
      loopRef.current++
      activeRef.current = false
      cancelAnimationFrame(rafRef.current)
      setInferring(false)
    }
    document.addEventListener('visibilitychange', visibility)
    window.addEventListener('pageshow', restore)
    return () => {
      document.removeEventListener('visibilitychange', visibility)
      window.removeEventListener('pageshow', restore)
      release()
    }
  }, [start, resume, fail, release])

  return { videoRef, canvasRef, status, error, stats, hands, inferring, start, stop, pause, resume }
}
