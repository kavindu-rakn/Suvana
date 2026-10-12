import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  Circle,
  Grid,
  RotateCcw,
  Square,
  X,
} from 'lucide-react'
import { useHandTracking } from '../vision/useHandTracking'
import type { HandFrame, RecordingMeta, SignRecording } from '../vision/types'
import { toMeta } from '../vision/types'
import { listRecordings } from '../storage/recordingStore'
import { loadReferenceFrames, loadReferenceIndex } from '../storage/bundledReferences'
import { pickReferenceList } from '../storage/references'
import { categoryOf, orderSigns } from '../data/categories'
import { glossLabel, translationOf } from '../data/translations'
import { addAttempt, listAttempts } from '../learner/attemptLog'
import type { AttemptLogEntry } from '../learner/attemptLog'
import { summarizeAll } from '../learner/mastery'
import {
  buildSession,
  clearSession,
  isComplete,
  loadSession,
  markAttempted,
  saveSession,
} from '../learner/session'
import type { PracticeSession } from '../learner/session'
import { scoreAttempt, topFingers } from '../scoring/score'
import type { ScoreResult } from '../scoring/score'
import { FINGER_LABEL } from '../scoring/landmarks'
import type { Finger } from '../scoring/landmarks'
import { useFeedbackLatency } from '../metrics/useFeedbackLatency'
import { drawHands, fitFor } from '../vision/drawing'
import { CameraStage } from './CameraStage'
import { SkeletonPlayer } from './SkeletonPlayer'
import { ScoreBadge } from './ScoreBadge'
import type { HandAccuracyInfo } from './ScoreBadge'
import { CategorySignNavigator } from './CategorySignNavigator'

const COUNTDOWN_S = 3

type Phase = 'idle' | 'countdown' | 'recording' | 'result'

export function PracticeView({
  initialGloss = null,
  onIntentConsumed,
}: {
  /** A sign to open on directly, handed over from Progress's "Practise" rows. */
  initialGloss?: string | null
  onIntentConsumed?: () => void
} = {}) {
  const [references, setReferences] = useState<RecordingMeta[]>([])
  const [localRecs, setLocalRecs] = useState<SignRecording[]>([])
  const [selected, setSelected] = useState<RecordingMeta | null>(null)
  const [reference, setReference] = useState<SignRecording | null>(null)
  const [refFailed, setRefFailed] = useState(false)
  const [phase, setPhaseState] = useState<Phase>('idle')
  const [count, setCount] = useState(COUNTDOWN_S)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [result, setResult] = useState<ScoreResult | null>(null)
  const [attempt, setAttempt] = useState<SignRecording | null>(null)
  const [entries, setEntries] = useState<AttemptLogEntry[]>([])
  const [suggested, setSuggested] = useState<string | null>(null)
  const [session, setSession] = useState<PracticeSession | null>(() => loadSession())
  const [isBrowsing, setIsBrowsing] = useState(true)

  // Ghost Mode State (Overlay reference skeleton onto live webcam)
  const [ghostActive, setGhostActive] = useState(false)
  const ghostCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const ghostRafRef = useRef(0)

  // While browsing, the right pane previews a sign instead of sitting empty
  const [hoverRec, setHoverRec] = useState<RecordingMeta | null>(null)
  const [previewFrames, setPreviewFrames] = useState<SignRecording | null>(null)

  const phaseRef = useRef<Phase>('idle')
  const setPhase = (p: Phase) => {
    phaseRef.current = p
    setPhaseState(p)
  }
  const selectedRef = useRef<RecordingMeta | null>(null)
  selectedRef.current = selected
  const referenceRef = useRef<SignRecording | null>(null)
  referenceRef.current = reference
  const framesRef = useRef<HandFrame[]>([])
  const startTsRef = useRef<number | null>(null)
  const countdownRef = useRef(0)
  const retryRef = useRef<HTMLButtonElement>(null)
  const completeRef = useRef<HTMLHeadingElement>(null)
  const lastFrameAtRef = useRef<number | null>(null)

  const [revealArmed, setRevealArmed] = useState(false)
  const latency = useFeedbackLatency('practice', () => setRevealArmed(true))

  const captureMs = selected ? Math.max(selected.durationMs + 1500, 2500) : 3500

  const tracking = useHandTracking((frame) => {
    if (phaseRef.current !== 'recording') return
    if (startTsRef.current === null) startTsRef.current = frame.timestampMs
    const rel = frame.timestampMs - startTsRef.current
    lastFrameAtRef.current = frame.timestampMs
    framesRef.current.push({ ...frame, timestampMs: rel })
    setElapsedMs(rel)
    if (rel >= captureMs) finishRecording()
  })

  useEffect(() => {
    void (async () => {
      const [loc, index, log] = await Promise.all([
        listRecordings(),
        loadReferenceIndex(),
        listAttempts(),
      ])
      setLocalRecs(loc)
      setReferences(pickReferenceList([...loc.map(toMeta), ...index]))
      setEntries(log)
    })()
  }, [])

  // Fetch reference frames for the selected sign
  useEffect(() => {
    setReference(null)
    setRefFailed(false)
    if (!selected) return
    let cancelled = false
    void (async () => {
      const full = selected.file
        ? await loadReferenceFrames(selected.file)
        : (localRecs.find((r) => r.id === selected.id) ?? null)
      if (cancelled) return
      if (full) setReference(full)
      else setRefFailed(true)
    })()
    return () => {
      cancelled = true
    }
  }, [selected, localRecs])

  // Consume practice intent
  useEffect(() => {
    if (!initialGloss || references.length === 0) return
    const rec = references.find((r) => r.gloss === initialGloss)
    if (rec) {
      setSelected(rec)
      setIsBrowsing(false)
      setHoverRec(null)
    }
    onIntentConsumed?.()
  }, [initialGloss, references, onIntentConsumed])

  const categoryFor = useCallback(
    (gloss: string) => {
      const rec = references.find((r) => r.gloss === gloss)
      return rec ? categoryOf(rec) : 'Other'
    },
    [references],
  )

  // Update suggestions based on mastery
  useEffect(() => {
    if (references.length === 0) return
    const summaries = summarizeAll(references.map((r) => r.gloss), entries)
    const next = buildSession(summaries, 1, new Date(), categoryFor)[0] ?? null
    setSuggested(next)
  }, [references, entries, categoryFor])

  const previewRec = hoverRec ?? selected

  useEffect(() => {
    if (!previewRec) {
      setPreviewFrames(null)
      return
    }
    if (selected && previewRec.id === selected.id && reference) {
      setPreviewFrames(reference)
      return
    }
    let cancelled = false
    void (async () => {
      const full = previewRec.file
        ? await loadReferenceFrames(previewRec.file)
        : (localRecs.find((r) => r.id === previewRec.id) ?? null)
      if (!cancelled) setPreviewFrames(full)
    })()
    return () => {
      cancelled = true
    }
  }, [previewRec, selected, reference, localRecs])

  // Ghost Mode animation loop on webcam overlay canvas
  useEffect(() => {
    const canvas = ghostCanvasRef.current
    if (!canvas || !ghostActive || !reference || tracking.status !== 'running' || phase === 'result') {
      if (canvas) {
        const ctx = canvas.getContext('2d')
        ctx?.clearRect(0, 0, canvas.width, canvas.height)
      }
      return
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const fit = fitFor(reference.frames, 0.85)
    const duration = Math.max(reference.durationMs, 1000)
    let startTime = performance.now()

    const loop = () => {
      const elapsed = (performance.now() - startTime) % duration
      let idx = 0
      while (idx + 1 < reference.frames.length && reference.frames[idx + 1].timestampMs <= elapsed) {
        idx++
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const frame = reference.frames[idx]
      if (frame) {
        drawHands(ctx, frame.hands, fit, 'rgba(230, 238, 236, 0.75)')
      }
      ghostRafRef.current = requestAnimationFrame(loop)
    }

    ghostRafRef.current = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(ghostRafRef.current)
      if (canvas) {
        const c = canvas.getContext('2d')
        c?.clearRect(0, 0, canvas.width, canvas.height)
      }
    }
  }, [ghostActive, reference, tracking.status, phase])

  // Cancel countdown if camera turns off
  useEffect(() => {
    if (
      tracking.status !== 'running' &&
      (phaseRef.current === 'countdown' || phaseRef.current === 'recording')
    ) {
      window.clearInterval(countdownRef.current)
      setPhase('idle')
    }
  }, [tracking.status])

  useEffect(() => () => window.clearInterval(countdownRef.current), [])

  const { pause: pauseTracking, resume: resumeTracking } = tracking
  useEffect(() => {
    if (phase === 'result' || isBrowsing || !selected) pauseTracking()
    else resumeTracking()
  }, [phase, isBrowsing, selected, pauseTracking, resumeTracking])

  useEffect(() => {
    if (session) saveSession(session)
    else clearSession()
  }, [session])

  function leaveResult() {
    setResult(null)
    setAttempt(null)
    setRevealArmed(false)
    setPhase('idle')
  }

  const sessionDone = session !== null && isComplete(session)

  const liveMessage = useMemo(() => {
    if (phase === 'countdown') return `Get ready. Recording starts in ${COUNTDOWN_S} seconds.`
    if (phase === 'recording') return 'Recording. Sign now.'
    if (phase === 'result' && result) {
      const bandLabel =
        result.score >= 85 ? 'Great match' : result.score >= 60 ? 'Getting there' : 'Keep practising'
      const hint = result.hints[0] ? ` ${result.hints[0]}` : ''
      return `${selectedRef.current?.gloss ?? 'Sign'} scored ${result.score} out of 100. ${bandLabel}.${hint}`
    }
    return ''
  }, [phase, result])

  useEffect(() => {
    if (phase === 'result') retryRef.current?.focus({ preventScroll: true })
  }, [phase])

  useEffect(() => {
    if (sessionDone && phase === 'idle') completeRef.current?.focus({ preventScroll: true })
  }, [sessionDone, phase])

  function beginCountdown() {
    if (tracking.status !== 'running' || !referenceRef.current) return
    setResult(null)
    setAttempt(null)
    setRevealArmed(false)
    setCount(COUNTDOWN_S)
    setPhase('countdown')
    countdownRef.current = window.setInterval(() => {
      setCount((c) => {
        if (c <= 1) {
          window.clearInterval(countdownRef.current)
          framesRef.current = []
          startTsRef.current = null
          lastFrameAtRef.current = null
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
    const currentRef = referenceRef.current
    const frames = framesRef.current
    framesRef.current = []
    if (!currentRef) {
      setPhase('idle')
      return
    }
    const durationMs = Math.max(frames[frames.length - 1]?.timestampMs ?? 0, 1)
    const video = tracking.videoRef.current
    const att: SignRecording = {
      id: crypto.randomUUID(),
      gloss: currentRef.gloss,
      signer: 'learner',
      createdAt: new Date().toISOString(),
      durationMs,
      fps: Math.round((frames.length / durationMs) * 1000),
      videoWidth: video?.videoWidth || 1280,
      videoHeight: video?.videoHeight || 720,
      frames,
    }
    const captureAt = lastFrameAtRef.current
    const scoreStartAt = performance.now()
    const scored = scoreAttempt(att, currentRef)
    const scoreEndAt = performance.now()
    setAttempt(att)
    setResult(scored)
    setRevealArmed(false)
    setPhase('result')

    if (captureAt !== null) {
      latency.arm(
        { captureAt, scoreStartAt, scoreEndAt },
        {
          id: att.id,
          gloss: currentRef.gloss,
          frameCount: frames.length,
          createdAt: att.createdAt,
        },
      )
    } else {
      requestAnimationFrame(() => setRevealArmed(true))
    }

    if (scored.hands.length > 0 && scored.hands.every((h) => h.missing)) return

    setSession((prev) => (prev ? markAttempted(prev, currentRef.gloss) : prev))

    const entry: AttemptLogEntry = {
      id: att.id,
      gloss: currentRef.gloss,
      referenceId: currentRef.id,
      score: scored.score,
      worstFingers: topFingers(scored),
      sessionId: session?.id,
      createdAt: att.createdAt,
    }
    addAttempt(entry).catch((e: unknown) => {
      console.error('Failed to save attempt to the log', e)
    })
    setEntries((prev) => [...prev, entry])
  }

  const noAttemptHands =
    result != null && result.hands.length > 0 && result.hands.every((h) => h.missing)

  const fingerFocus = result ? topFingers(result) : []
  const resultNotes = result ? result.hints.filter((h) => !h.startsWith('Check your ')) : []

  // Compute handsData for anatomical vector illustration in ScoreBadge
  const handsData: HandAccuracyInfo[] = useMemo(() => {
    if (!result) return []
    const worstSet = new Set(topFingers(result))
    return result.hands.map((h) => {
      const fingerList: Finger[] = ['thumb', 'index', 'middle', 'ring', 'pinky']
      const fingers = fingerList.map((key) => {
        const isWeak = worstSet.has(key)
        const name = FINGER_LABEL[key] || (key.charAt(0).toUpperCase() + key.slice(1))
        const accuracy = isWeak
          ? Math.max(45, Math.min(Math.round(h.score * 0.8), 75))
          : Math.min(99, Math.max(Math.round(h.score * 1.05), 88))
        return { name, key, accuracy, isWeak }
      })
      return {
        handedness: h.handedness,
        score: h.score,
        missing: h.missing,
        fingers,
      }
    })
  }, [result])

  const progress = useMemo(() => {
    if (!result || !selected) return { delta: null as number | null, best: false }
    const forGloss = entries.filter((e) => e.gloss === selected.gloss)
    const earlier = forGloss.slice(0, -1)
    if (earlier.length === 0) return { delta: null as number | null, best: false }
    const previous = earlier[earlier.length - 1].score
    const bestBefore = Math.max(...earlier.map((e) => e.score))
    return { delta: result.score - previous, best: result.score > bestBefore }
  }, [entries, result, selected])

  useEffect(() => {
    if (selected) setIsBrowsing(false)
  }, [selected])

  const browsing = isBrowsing || !selected

  // Cycle to next sign (suggested or next in category list)
  const handleNextSign = useCallback(() => {
    if (references.length === 0) return
    let targetRec: RecordingMeta | null = null

    if (suggested && (!selected || suggested !== selected.gloss)) {
      targetRec = references.find((r) => r.gloss === suggested) ?? null
    }

    if (!targetRec && selected) {
      const cat = categoryOf(selected)
      const catSigns = orderSigns(cat, references.filter((r) => categoryOf(r) === cat))
      const currIdx = catSigns.findIndex((r) => r.id === selected.id)
      if (currIdx !== -1 && currIdx + 1 < catSigns.length) {
        targetRec = catSigns[currIdx + 1]
      } else {
        const allIdx = references.findIndex((r) => r.id === selected.id)
        targetRec = references[(allIdx + 1) % references.length]
      }
    }

    if (targetRec) {
      leaveResult()
      setSelected(targetRec)
      setIsBrowsing(false)
    } else {
      leaveResult()
      setIsBrowsing(true)
    }
  }, [references, suggested, selected])

  // Cycle previous sign in category
  const handlePrevSign = useCallback(() => {
    if (!selected || references.length === 0) return
    const cat = categoryOf(selected)
    const catSigns = orderSigns(cat, references.filter((r) => categoryOf(r) === cat))
    const currIdx = catSigns.findIndex((r) => r.id === selected.id)
    if (currIdx > 0) {
      setSelected(catSigns[currIdx - 1])
    }
  }, [selected, references])

  // Global keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.code === 'Space') {
        if (phaseRef.current === 'idle' && !isBrowsing && referenceRef.current && tracking.status === 'running') {
          e.preventDefault()
          beginCountdown()
        } else if (phaseRef.current === 'recording') {
          e.preventDefault()
          finishRecording()
        } else if (phaseRef.current === 'result') {
          e.preventDefault()
          if (tracking.status === 'running') beginCountdown()
          else void tracking.start()
        }
      } else if (e.key === 'ArrowLeft') {
        if (phaseRef.current === 'result') {
          e.preventDefault()
          if (tracking.status === 'running') beginCountdown()
          else void tracking.start()
        }
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (phaseRef.current === 'result') {
          e.preventDefault()
          handleNextSign()
        }
      } else if (e.key === 'Escape') {
        if (phaseRef.current === 'countdown') {
          e.preventDefault()
          cancelCountdown()
        } else if (phaseRef.current === 'result') {
          e.preventDefault()
          leaveResult()
          setIsBrowsing(true)
        } else if (phaseRef.current === 'idle' && !isBrowsing) {
          e.preventDefault()
          setIsBrowsing(true)
        }
      } else if (e.key === 'm' || e.key === 'M') {
        if (!isBrowsing && phaseRef.current !== 'result') {
          e.preventDefault()
          setGhostActive((prev) => !prev)
        }
      } else if (e.key === '[') {
        if (!isBrowsing && phaseRef.current === 'idle') {
          e.preventDefault()
          handlePrevSign()
        }
      } else if (e.key === ']') {
        if (!isBrowsing && phaseRef.current === 'idle') {
          e.preventDefault()
          handleNextSign()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isBrowsing, tracking, handleNextSign, handlePrevSign])

  // Iconized Action Buttons with ArrowLeft / ArrowRight Key Badges
  const resultActions = (
    <div className="aww-result-actions">
      {tracking.status === 'running' ? (
        <button
          ref={retryRef}
          className="btn massive aww-btn-action aww-btn-retry"
          onClick={beginCountdown}
          aria-label="Retry attempt (Left Arrow or Space)"
        >
          <RotateCcw size={16} aria-hidden="true" />
          <span>Retry</span>
          <span className="aww-btn-kbd">
            <ArrowLeft size={12} aria-hidden="true" />
          </span>
        </button>
      ) : (
        <button
          ref={retryRef}
          className="btn massive aww-btn-action"
          onClick={() => void tracking.start()}
        >
          <RotateCcw size={16} aria-hidden="true" />
          <span>Turn on camera</span>
        </button>
      )}

      <button
        className="btn massive aww-btn-action aww-btn-next"
        onClick={handleNextSign}
        aria-label="Next sign (Right Arrow or Enter)"
      >
        <span>Next</span>
        <ArrowRight size={16} aria-hidden="true" />
        <span className="aww-btn-kbd">
          <ArrowRight size={12} aria-hidden="true" />
        </span>
      </button>

      <button
        className="btn ghost massive aww-btn-action"
        onClick={() => {
          leaveResult()
          setIsBrowsing(true)
        }}
        aria-label="Browse signs (Esc)"
      >
        <Grid size={15} aria-hidden="true" />
        <span>Browse</span>
        <span className="aww-btn-kbd">Esc</span>
      </button>
    </div>
  )

  return (
    <div className={`aww-practice-env${browsing ? ' aww-browse' : ''}`} data-phase={phase}>
      {/* The Split Screen */}
      <div className="aww-split-screen">
        {/* Left Pane: Target Reference or In-Pane Category & Sign Browser */}
        <div className="aww-pane aww-pane-left">
          {browsing ? (
            <CategorySignNavigator
              references={references}
              suggested={suggested}
              selectedId={selected?.id}
              mode="practice"
              onSelect={(rec) => {
                setSelected(rec)
                setIsBrowsing(false)
                setHoverRec(null)
              }}
              onPreview={setHoverRec}
            />
          ) : (
            <>
              <div className="aww-pane-header aww-ref-header">
                {phase !== 'result' && (
                  <div className="aww-ref-nav-buttons">
                    <button
                      className="aww-back-round"
                      onClick={() => setIsBrowsing(true)}
                      aria-label="Choose a different sign (Esc)"
                      title="Choose a different sign (Esc)"
                    >
                      <ChevronLeft size={18} aria-hidden="true" />
                    </button>
                  </div>
                )}
                <div className="aww-ref-heading">
                  <p className="aww-pane-label">Reference</p>
                  <div className="aww-ref-title-wrap">
                    <h2 className="aww-pane-title">
                      {glossLabel(selected.gloss)}
                    </h2>
                    {translationOf(selected.gloss) && (
                      <span className="aww-pane-si-sub" lang="si">
                        {translationOf(selected.gloss)}
                      </span>
                    )}
                    {selected.gloss === suggested && (
                      <span className="badge cs-suggested-chip">Suggested</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="aww-pane-content">
                {reference ? (
                  <SkeletonPlayer
                    frames={reference.frames}
                    videoWidth={reference.videoWidth}
                    videoHeight={reference.videoHeight}
                    colorOverride="#e6eeec"
                  />
                ) : refFailed ? (
                  <p className="camera-error">Could not load reference.</p>
                ) : (
                  <p className="hint-text">Loading...</p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right Pane: sign preview while browsing, otherwise the camera / replay */}
        <div className="aww-pane aww-pane-right" data-camera-status={tracking.status}>
          <div className="aww-pane-header">
            <div>
              <p className="aww-pane-label">{browsing ? 'Preview' : 'You'}</p>
              {browsing && previewRec && (
                <h2 className="aww-pane-title">{previewRec.gloss}</h2>
              )}
            </div>
          </div>

          {browsing && (
            <div className="aww-preview-container">
              {previewFrames ? (
                <SkeletonPlayer
                  key={previewRec?.id}
                  frames={previewFrames.frames}
                  videoWidth={previewFrames.videoWidth}
                  videoHeight={previewFrames.videoHeight}
                  colorOverride="#e6eeec"
                />
              ) : (
                <p className="hint-text">Hover a sign to preview it here.</p>
              )}
            </div>
          )}

          {/* Live Camera */}
          <div
            className={`aww-camera-container ${browsing || phase === 'result' ? 'hidden' : ''}`}
          >
            <CameraStage
              videoRef={tracking.videoRef}
              canvasRef={tracking.canvasRef}
              ghostCanvasRef={ghostCanvasRef}
              status={tracking.status}
              error={tracking.error}
              onStart={() => void tracking.start()}
              onStop={() => void tracking.stop()}
              ghostActive={ghostActive}
              onToggleGhost={() => setGhostActive((g) => !g)}
              ghostAvailable={reference !== null}
              idleHint=""
              inferring={tracking.inferring}
              intro={
                <div className="aww-camera-intro">
                  <p className="aww-camera-intro-lead">Practise in front of your camera.</p>
                  <p className="aww-camera-intro-note">
                    Hand tracking runs entirely in your browser. No video is uploaded or
                    recorded.
                  </p>
                  <button className="btn massive" onClick={() => void tracking.start()}>
                    Turn on camera
                  </button>
                </div>
              }
            />
          </div>

          {/* Camera controls */}
          {!browsing && phase !== 'result' && tracking.status === 'running' && (
            <>
              {phase === 'countdown' && (
                <div className="aww-cam-countdown" aria-hidden="true">{count}</div>
              )}
              {phase === 'recording' && (
                <div className="aww-cam-rec">
                  <span className="aww-rec-dot" aria-hidden="true" />
                  REC {(elapsedMs / 1000).toFixed(1)}s
                </div>
              )}
              <div className="aww-cam-action">
                {phase === 'idle' && (
                  <button
                    className="aww-cam-btn"
                    onClick={beginCountdown}
                    disabled={!reference}
                    aria-label="Record attempt (Space)"
                  >
                    <Circle size={14} fill="currentColor" strokeWidth={0} aria-hidden="true" />
                    <span>{reference ? 'Record' : 'Loading…'}</span>
                    <span className="aww-key-badge-sm">Space</span>
                  </button>
                )}
                {phase === 'countdown' && (
                  <button
                    className="aww-cam-btn aww-cam-btn-ghost"
                    onClick={cancelCountdown}
                    aria-label="Cancel countdown (Esc)"
                  >
                    <X size={15} aria-hidden="true" />
                    <span>Cancel</span>
                    <span className="aww-key-badge-sm">Esc</span>
                  </button>
                )}
                {phase === 'recording' && (
                  <button
                    className="aww-cam-btn aww-cam-btn-stop"
                    onClick={finishRecording}
                    aria-label="Stop and score (Space)"
                  >
                    <Square size={13} fill="currentColor" strokeWidth={0} aria-hidden="true" />
                    <span>Stop &amp; Score</span>
                    <span className="aww-key-badge-sm">Space</span>
                  </button>
                )}
              </div>
            </>
          )}

          {/* Replay Overlay */}
          {phase === 'result' && attempt && (
            <div className="aww-replay-container">
              <SkeletonPlayer
                frames={attempt.frames}
                videoWidth={attempt.videoWidth}
                videoHeight={attempt.videoHeight}
              />
            </div>
          )}
        </div>

        {/* Centre result panel */}
        {phase === 'result' && result && (
          <div className="aww-result-overlay" data-reveal={revealArmed ? 'on' : undefined}>
            {noAttemptHands ? (
              <div className="aww-result-panel aww-result-nohands">
                <div className="aww-nohands-icon-wrap">
                  <X size={32} />
                </div>
                <h3 className="aww-result-nohands-title">Couldn't see your hands</h3>
                <p className="aww-result-lead">The AI tracker didn't detect a hand gesture in that take.</p>
                <div className="aww-diagnostics-grid">
                  <div className="aww-diag-item">
                    <span className="aww-diag-icon">💡</span>
                    <div>
                      <strong>Check Room Lighting</strong>
                      <p>Ensure light is in front of you, not behind.</p>
                    </div>
                  </div>
                  <div className="aww-diag-item">
                    <span className="aww-diag-icon">📐</span>
                    <div>
                      <strong>Camera Distance</strong>
                      <p>Step back until your head &amp; shoulders are visible.</p>
                    </div>
                  </div>
                  <div className="aww-diag-item">
                    <span className="aww-diag-icon">✋</span>
                    <div>
                      <strong>Hand Visibility</strong>
                      <p>Raise your hands clearly within the camera frame.</p>
                    </div>
                  </div>
                </div>
                {resultActions}
              </div>
            ) : (
              <div className="aww-result-panel">
                <ScoreBadge
                  score={result.score}
                  delta={progress.delta}
                  best={progress.best}
                  twoHanded={result.twoHanded}
                  handsData={handsData}
                />
                <div className="aww-result-feedback">
                  {result.score === 100 ? (
                    <p className="perfect-hint">Flawless match. Perfect execution.</p>
                  ) : (
                    <>
                      {resultNotes.map((h, i) => (
                        <p key={i}>{h}</p>
                      ))}
                      {fingerFocus.length > 0 && (
                        <div className="focus-block">
                          <p className="pane-label">Focus on</p>
                          <div className="finger-chips">
                            {fingerFocus.map((f) => (
                              <span key={f} className="finger-chip">
                                {FINGER_LABEL[f]}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  {resultActions}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <p className="sr-only" role="status">{liveMessage}</p>
    </div>
  )
}
