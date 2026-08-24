import { useEffect, useRef, useState } from 'react'
import { useHandTracking } from '../vision/useHandTracking'
import { handCoverage } from '../vision/types'
import type { HandFrame, SignRecording } from '../vision/types'
import { saveRecording } from '../storage/recordingStore'
import { SEED_GLOSSES } from '../data/glosses'
import { CameraStage } from './CameraStage'
import { SkeletonPlayer } from './SkeletonPlayer'

const COUNTDOWN_S = 3
const MAX_MS = 8000
const SIGNER_KEY = 'ssl-learn-signer'

type Phase = 'idle' | 'countdown' | 'recording' | 'review'

/**
 * Reference-recording studio: pick a gloss, 3-2-1 countdown, capture up to
 * 8 s of landmark frames, review the skeleton replay, save to the library.
 * Only landmarks are stored — never video.
 */
export function RecordView() {
  const [phase, setPhaseState] = useState<Phase>('idle')
  const phaseRef = useRef<Phase>('idle')
  const setPhase = (p: Phase) => {
    phaseRef.current = p
    setPhaseState(p)
  }

  const [gloss, setGloss] = useState('')
  const [signer, setSigner] = useState(() => localStorage.getItem(SIGNER_KEY) ?? '')
  const [count, setCount] = useState(COUNTDOWN_S)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [review, setReview] = useState<SignRecording | null>(null)
  const [justSaved, setJustSaved] = useState(false)
  const [saveError, setSaveError] = useState('')

  const framesRef = useRef<HandFrame[]>([])
  const startTsRef = useRef<number | null>(null)
  const countdownRef = useRef(0)
  const savedFlashRef = useRef(0)
  const glossRef = useRef(gloss)
  glossRef.current = gloss
  const signerRef = useRef(signer)
  signerRef.current = signer

  const tracking = useHandTracking((frame) => {
    if (phaseRef.current !== 'recording') return
    if (startTsRef.current === null) startTsRef.current = frame.timestampMs
    const rel = frame.timestampMs - startTsRef.current
    framesRef.current.push({ ...frame, timestampMs: rel })
    setElapsedMs(rel)
    if (rel >= MAX_MS) finishRecording()
  })

  // If the camera stops mid-take (stopped, unplugged…), abandon the take.
  useEffect(() => {
    if (
      tracking.status !== 'running' &&
      (phaseRef.current === 'countdown' || phaseRef.current === 'recording')
    ) {
      window.clearInterval(countdownRef.current)
      setPhase('idle')
    }
  }, [tracking.status])

  useEffect(
    () => () => {
      window.clearInterval(countdownRef.current)
      window.clearTimeout(savedFlashRef.current)
    },
    [],
  )

  // Reviewing a take consumes no frames — see useHandTracking.pause.
  const { pause: pauseTracking, resume: resumeTracking } = tracking
  useEffect(() => {
    if (phase === 'review') pauseTracking()
    else resumeTracking()
  }, [phase, pauseTracking, resumeTracking])

  function beginCountdown() {
    // Signer is required: a reference whose performer is unknown cannot be
    // traced back or replaced later, and provenance is the whole point of
    // distinguishing team stand-ins from authoritative SSL.
    if (tracking.status !== 'running' || !gloss.trim() || !signer.trim()) return
    setReview(null)
    setCount(COUNTDOWN_S)
    setPhase('countdown')
    countdownRef.current = window.setInterval(() => {
      setCount((c) => {
        if (c <= 1) {
          window.clearInterval(countdownRef.current)
          framesRef.current = []
          startTsRef.current = null
          setElapsedMs(0)
          setPhase('recording')
          return 0
        }
        return c - 1
      })
    }, 1000)
  }

  function cancelCountdown() {
    window.clearInterval(countdownRef.current)
    setPhase('idle')
  }

  function finishRecording() {
    if (phaseRef.current !== 'recording') return
    const frames = framesRef.current
    framesRef.current = []
    if (frames.length === 0) {
      setPhase('idle')
      return
    }
    const durationMs = Math.max(frames[frames.length - 1].timestampMs, 1)
    const video = tracking.videoRef.current
    setReview({
      id: crypto.randomUUID(),
      gloss: glossRef.current.trim().toUpperCase(),
      signer: signerRef.current.trim() || 'unknown',
      // Team recordings unblock development but are not authoritative SSL, so
      // they are marked here and labelled wherever they surface.
      source: 'team-recording',
      provisional: true,
      createdAt: new Date().toISOString(),
      durationMs,
      fps: Math.round((frames.length / durationMs) * 1000),
      videoWidth: video?.videoWidth || 1280,
      videoHeight: video?.videoHeight || 720,
      frames,
    })
    setPhase('review')
  }

  async function save() {
    if (!review) return
    try {
      await saveRecording(review)
    } catch (e) {
      // Keep the take on screen so a storage failure can't quietly discard it.
      console.error('Failed to save recording', e)
      setSaveError('Could not save to the library. Your recording is still here — try again.')
      return
    }
    setSaveError('')
    localStorage.setItem(SIGNER_KEY, signerRef.current)
    setReview(null)
    setPhase('idle')
    setJustSaved(true)
    savedFlashRef.current = window.setTimeout(() => setJustSaved(false), 2500)
  }

  const inputsLocked = phase === 'countdown' || phase === 'recording'
  const coverage = review ? handCoverage(review.frames) : 0

  return (
    <div className="record-layout" data-phase={phase}>
      <section className="camera-card">
        <CameraStage
          videoRef={tracking.videoRef}
          canvasRef={tracking.canvasRef}
          status={tracking.status}
          error={tracking.error}
          onStart={() => void tracking.start()}
          idleHint="Start the camera to record reference signs for the library."
          inferring={tracking.inferring}
        >
          {phase === 'countdown' && (
            <div className="countdown-overlay">
              <span key={count}>{count}</span>
            </div>
          )}
          {phase === 'recording' && (
            <>
              <div className="rec-badge">● REC {(elapsedMs / 1000).toFixed(1)} s</div>
              <div className="rec-progress">
                <div style={{ transform: `scaleX(${Math.min(elapsedMs / MAX_MS, 1)})` }} />
              </div>
            </>
          )}
        </CameraStage>

        <div className="camera-bar">
          {tracking.status === 'running' ? (
            <>
              <button className="btn btn-ghost" onClick={tracking.stop} disabled={inputsLocked}>
                Stop camera
              </button>
              {tracking.stats && (
                <span className="camera-stats">
                  {tracking.stats.fps.toFixed(0)} fps · {tracking.stats.inferenceMs.toFixed(1)} ms
                  · {tracking.stats.width}×{tracking.stats.height}
                </span>
              )}
            </>
          ) : (
            <span className="camera-stats">Only landmarks are recorded — never video.</span>
          )}
        </div>
      </section>

      <aside className="record-panel">
        {phase !== 'review' ? (
          <>
            <h2>New reference recording</h2>
            <label className="field">
              Sign (gloss)
              <input
                type="text"
                value={gloss}
                onChange={(e) => setGloss(e.target.value.toUpperCase())}
                placeholder="e.g. ME"
                disabled={inputsLocked}
              />
            </label>
            <div className="gloss-chips">
              {SEED_GLOSSES.map((g) => (
                <button
                  key={g}
                  className={gloss === g ? 'chip active' : 'chip'}
                  onClick={() => setGloss(g)}
                  disabled={inputsLocked}
                >
                  {g}
                </button>
              ))}
            </div>
            <label className="field">
              Signer
              <input
                type="text"
                value={signer}
                onChange={(e) => setSigner(e.target.value)}
                placeholder="who is signing?"
                disabled={inputsLocked}
              />
            </label>

            {phase === 'countdown' ? (
              <button className="btn btn-ghost" onClick={cancelCountdown}>
                Cancel
              </button>
            ) : phase === 'recording' ? (
              <button className="btn" onClick={finishRecording}>
                Stop recording
              </button>
            ) : (
              <button
                className="btn"
                onClick={beginCountdown}
                disabled={tracking.status !== 'running' || !gloss.trim() || !signer.trim()}
                title={
                  tracking.status !== 'running'
                    ? 'Start the camera first'
                    : !gloss.trim()
                      ? 'Choose a gloss first'
                      : !signer.trim()
                        ? 'Enter who is signing first'
                      : undefined
                }
              >
                Record
              </button>
            )}
            {justSaved && <span className="saved-flash">Saved to library ✓</span>}
            <p className="hint-text">
              {COUNTDOWN_S}-second countdown, then up to {MAX_MS / 1000} s. Sign once, at a
              natural pace, and stop.
            </p>
          </>
        ) : (
          review && (
            <>
              <h2>Review — {review.gloss}</h2>
              <SkeletonPlayer
                frames={review.frames}
                videoWidth={review.videoWidth}
                videoHeight={review.videoHeight}
              />
              <ul className="rec-facts">
                <li>
                  {(review.durationMs / 1000).toFixed(1)} s · {review.frames.length} frames · ~
                  {review.fps} fps
                </li>
                <li>Hands tracked in {(coverage * 100).toFixed(0)}% of frames</li>
                <li>Signed by {review.signer}</li>
              </ul>
              {coverage < 0.6 && (
                <p className="camera-error">
                  Hands were only caught in a few frames — check the framing and lighting, then
                  re-record.
                </p>
              )}
              {saveError && <p className="camera-error">{saveError}</p>}
              <div className="row-buttons">
                <button className="btn" onClick={() => void save()}>
                  Save to library
                </button>
                <button className="btn btn-ghost" onClick={beginCountdown}>
                  Re-record
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    setReview(null)
                    setPhase('idle')
                  }}
                >
                  Discard
                </button>
              </div>
            </>
          )
        )}
      </aside>
    </div>
  )
}
