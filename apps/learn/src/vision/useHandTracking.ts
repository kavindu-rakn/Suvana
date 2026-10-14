import { useCallback, useEffect, useRef, useState } from 'react'
import { getHandLandmarker } from './handTracker'
import { drawHands } from './drawing'
import { toHandFrame } from './types'
import type { HandFrame, TrackedHand } from './types'
import { CAMERA_LOSS_GRACE_MS, NO_CAMERA_INTERRUPTION, cameraInterruptionTransition,
  cameraRestoreAction, releaseStream, watchStream } from './cameraLifecycle'
import type { CameraTrackEvent } from './cameraLifecycle'
import { recordCameraEvent } from './cameraDebug'

export type TrackingStatus = 'idle' | 'starting' | 'running' | 'interrupted' | 'error'

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
  const cameraRunningRef = useRef(false)
  const startingRef = useRef(false)
  const restoringRef = useRef(false)
  const interruptionRef = useRef({ ...NO_CAMERA_INTERRUPTION })
  const lossTimerRef = useRef(0)
  const restoreCallbackRef = useRef<() => void>(() => {})
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
    window.clearTimeout(lossTimerRef.current)
    lossTimerRef.current = 0
    interruptionRef.current = { ...NO_CAMERA_INTERRUPTION, away: document.hidden }
    generationRef.current++
    loopRef.current++
    activeRef.current = false
    cameraRunningRef.current = false
    startingRef.current = false
    restoringRef.current = false
    cancelAnimationFrame(rafRef.current)
    releaseStream(streamRef.current)
    streamRef.current = null
    const video = videoRef.current
    if (video) video.srcObject = null
  }, [])

  const fail = useCallback((message: string) => {
    recordCameraEvent('failure', message)
    restoreRef.current = false
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
      if (loop === loopRef.current && !interruptionRef.current.away && interruptionRef.current.lostAt === null) fail(describeError(e))
    }
  }, [fail])

  const suspendFrames = useCallback(() => {
    loopRef.current++
    activeRef.current = false
    cancelAnimationFrame(rafRef.current)
    setInferring(false)
    setHands([])
  }, [])

  const trackChanged = useCallback((event: CameraTrackEvent) => {
    recordCameraEvent(event, `running=${cameraRunningRef.current}`)
    // document.hidden can change before its event listener has run.
    if (document.hidden) {
      interruptionRef.current = cameraInterruptionTransition(interruptionRef.current, 'away', performance.now()).state
      restoreRef.current = restoreRef.current || cameraRunningRef.current
    }
    const transition = cameraInterruptionTransition(interruptionRef.current, event, performance.now())
    interruptionRef.current = transition.state
    if (event === 'unmute') {
      if (transition.state.lostAt === null) {
        window.clearTimeout(lossTimerRef.current)
        lossTimerRef.current = 0
      }
      if (transition.action === 'resume' && !startingRef.current) {
        setStatus('running')
        restoreCallbackRef.current()
      }
      return
    }
    // Keep stream handlers and camera-on intent: unmute can end a pause, and
    // an upcoming blur/pagehide/visibilitychange can explain this loss.
    suspendFrames()
    setStatus('interrupted')
    setError('')
    if (!lossTimerRef.current && !transition.state.interrupted) {
      const remaining = Math.max(0, CAMERA_LOSS_GRACE_MS - (performance.now() - transition.state.lostAt!))
      lossTimerRef.current = window.setTimeout(() => {
        lossTimerRef.current = 0
        const expired = cameraInterruptionTransition(interruptionRef.current, 'timeout', performance.now())
        interruptionRef.current = expired.state
        if (expired.action === 'fail') fail('Camera disconnected')
      }, remaining)
    }
  }, [fail, suspendFrames])

  const start = useCallback(async () => {
    if (startingRef.current) return
    recordCameraEvent('start')
    release()
    restoreRef.current = false
    inferenceWantedRef.current = true
    const generation = generationRef.current
    startingRef.current = true
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
        cameraRunningRef.current = true
        if (document.hidden || interruptionRef.current.away) restoreRef.current = true
        watchStream(stream, (event) => {
          if (generation === generationRef.current) trackChanged(event)
        })
        return stream
      })
      const [stream] = await Promise.all([streamPromise, getHandLandmarker()])
      if (generation !== generationRef.current) return

      const video = videoRef.current
      if (!video) throw new Error('Video element is not mounted.')
      video.srcObject = stream
      // A background-ended stream cannot finish play(). Leave it for the one
      // return-time restart, including when model preparation was still pending.
      if (interruptionRef.current.lostAt !== null || interruptionRef.current.away) {
        setStatus('interrupted')
        return
      }
      try {
        await video.play()
      } catch (e) {
        if (generation !== generationRef.current) return
        if (!interruptionRef.current.away && interruptionRef.current.lostAt === null) throw e
        setStatus('interrupted')
        return
      }
      if (generation !== generationRef.current) return

      lastVideoTimeRef.current = -1
      emaRef.current = { fps: 0, inferenceMs: 0, lastFrameAt: 0, lastUiPush: 0 }
      setStatus(interruptionRef.current.lostAt === null ? 'running' : 'interrupted')
      cameraRunningRef.current = true
      activeRef.current = !document.hidden && !interruptionRef.current.away
        && interruptionRef.current.lostAt === null && inferenceWantedRef.current
      setInferring(activeRef.current)
      if (activeRef.current) rafRef.current = requestAnimationFrame(() => void processFrame())
    } catch (e) {
      if (generation === generationRef.current) fail(describeError(e))
    } finally {
      if (generation === generationRef.current) {
        startingRef.current = false
        if (restoreRef.current && !document.hidden && !interruptionRef.current.away) restoreCallbackRef.current()
      }
    }
  }, [processFrame, release, fail, trackChanged])

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
    if (document.hidden || interruptionRef.current.away || interruptionRef.current.lostAt !== null) return
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
    recordCameraEvent('stop')
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
      void video.play().catch((e) => {
        if (!interruptionRef.current.away && interruptionRef.current.lostAt === null) fail(describeError(e))
      })
      if (inferenceWantedRef.current) resume()
    }
  })

  // Safari may pause video on app switches or restore an ended stream from bfcache.
  useEffect(() => {
    const restart = () => {
      const wanted = inferenceWantedRef.current
      const request = start()
      // start() normally enables inference for a manual Try again. Automatic
      // recovery must preserve a result/browse pause; later UI intent wins.
      inferenceWantedRef.current = wanted
      return request
    }
    const restore = () => {
      const stream = streamRef.current
      const tracks = stream?.getVideoTracks() ?? []
      const action = cameraRestoreAction({ hidden: document.hidden || interruptionRef.current.away,
        wasRunningWhenHidden: restoreRef.current,
        streamUsable: tracks.length > 0 && tracks.every((track) => track.readyState === 'live' && !track.muted),
        starting: startingRef.current, restoring: restoringRef.current })
      if (action === 'none') return
      const wasRunning = restoreRef.current
      restoreRef.current = false // Consume BEFORE async work: at most one retry.
      restoringRef.current = true
      if (action === 'restart') {
        recordCameraEvent('restart')
        void restart().finally(() => { restoringRef.current = false })
        return
      }
      const generation = generationRef.current
      const video = videoRef.current
      if (!video) { restoringRef.current = false; return }
      window.clearTimeout(lossTimerRef.current)
      lossTimerRef.current = 0
      interruptionRef.current = { ...NO_CAMERA_INTERRUPTION }
      video.srcObject = stream
      void video.play().then(() => {
        if (generation === generationRef.current && !interruptionRef.current.away && interruptionRef.current.lostAt === null) {
          setStatus('running')
          if (inferenceWantedRef.current) resume()
        }
      }).catch((e) => {
        if (generation !== generationRef.current) return
        // A live-looking iOS stream can still fail to play. Use the same one
        // full restart as Try again; only that attempt's failure is surfaced.
        if (wasRunning) return restart()
        fail(describeError(e))
      }).finally(() => { restoringRef.current = false })
    }
    restoreCallbackRef.current = restore
    const away = () => {
      const transition = cameraInterruptionTransition(interruptionRef.current, 'away', performance.now())
      interruptionRef.current = transition.state
      if (transition.action === 'fail') return fail('Camera disconnected')
      restoreRef.current = restoreRef.current || cameraRunningRef.current
      suspendFrames()
    }
    const returned = () => {
      if (document.hidden) return
      interruptionRef.current = cameraInterruptionTransition(interruptionRef.current, 'return', performance.now()).state
      restore()
    }
    const visibility = () => {
      recordCameraEvent('visibilitychange')
      if (document.hidden) away()
      else returned()
    }
    const pagehide = () => { recordCameraEvent('pagehide'); away() }
    const pageshow = () => { recordCameraEvent('pageshow'); returned() }
    const blur = () => { recordCameraEvent('blur'); away() }
    const focus = () => { recordCameraEvent('focus'); returned() }
    document.addEventListener('visibilitychange', visibility)
    window.addEventListener('pagehide', pagehide)
    window.addEventListener('pageshow', pageshow)
    window.addEventListener('blur', blur)
    window.addEventListener('focus', focus)
    return () => {
      document.removeEventListener('visibilitychange', visibility)
      window.removeEventListener('pagehide', pagehide)
      window.removeEventListener('pageshow', pageshow)
      window.removeEventListener('blur', blur)
      window.removeEventListener('focus', focus)
      restoreCallbackRef.current = () => {}
      release()
    }
  }, [start, resume, fail, release, suspendFrames])

  return { videoRef, canvasRef, status, error, stats, hands, inferring, start, stop, pause, resume }
}
