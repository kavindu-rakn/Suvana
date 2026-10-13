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
import { glossLabel } from '../data/translations'
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
import { band } from '../scoring/band'
import { useFeedbackLatency } from '../metrics/useFeedbackLatency'
import { drawHands, fitFor } from '../vision/drawing'
import { CameraStage } from './CameraStage'
import { SkeletonPlayer } from './SkeletonPlayer'
import { ScoreBadge } from './ScoreBadge'
import type { HandFeedback } from './ScoreBadge'
import { CategorySignNavigator } from './CategorySignNavigator'
import { Onboarding } from './Onboarding'
import { onboardingSeen } from './onboardingFlag'
import { trimTake } from '../scoring/trimTake'
import { shortcutBlockedByTarget } from '../app/keyboard'
import { captureDeadline } from '../vision/cameraLifecycle'
import { progressAgainstEarlier, shouldLogAttempt } from '../learner/attemptProgress'

const COUNTDOWN_S = 3
/**
 * Slack after the capture window before the wall-clock backstop finishes the
 * take: frames normally end it at captureMs, so this only fires when frames
 * stop arriving. Untuned.
 */
const BACKSTOP_SLACK_MS = 500
/** Consecutive tracked frames with a hand before Record unlocks (spec L-07). */
const READY_STREAK = 5

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
  // Why the last countdown or take was abandoned, shown until the next one.
  const [captureNotice, setCaptureNotice] = useState<string | null>(null)
  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const firstRunCheckedRef = useRef(false)
  // Hands seen in READY_STREAK consecutive frames; a frame without one resets it.
  const [handsReady, setHandsReady] = useState(false)
  const handsReadyRef = useRef(false)
  const handStreakRef = useRef(0)

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
  const finishRef = useRef<() => void>(() => {})

  const [revealArmed, setRevealArmed] = useState(false)
  const latency = useFeedbackLatency('practice', () => setRevealArmed(true))

  // Long enough for a hesitant start; the take is trimmed to its tracked span
  // before scoring, so the extra hands-down time does not count against it.
  const captureMs = selected
    ? Math.max(2 * selected.durationMs, selected.durationMs + 3000)
    : 3500

  const setReady = (ready: boolean) => {
    if (ready === handsReadyRef.current) return
    handsReadyRef.current = ready
    setHandsReady(ready)
  }
  const resetReady = () => {
    handStreakRef.current = 0
    setReady(false)
  }

  const tracking = useHandTracking((frame) => {
    handStreakRef.current = frame.hands.length > 0 ? handStreakRef.current + 1 : 0
    setReady(handStreakRef.current >= READY_STREAK)
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
      // allSettled: a failed IndexedDB (blocked site storage) must not blank
      // the bundled signs. Each store that fails contributes nothing.
      const [locR, indexR, logR] = await Promise.allSettled([
        Promise.resolve().then(listRecordings),
        loadReferenceIndex(),
        Promise.resolve().then(listAttempts),
      ])
      const loc = locR.status === 'fulfilled' ? locR.value : []
      const index = indexR.status === 'fulfilled' ? indexR.value : []
      const log = logR.status === 'fulfilled' ? logR.value : []
      for (const r of [locR, indexR, logR]) {
        if (r.status === 'rejected') console.error('Practice could not load a store', r.reason)
      }
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

  // Readiness is about the frames arriving now: start over whenever they stop.
  useEffect(() => {
    if (tracking.status !== 'running') resetReady()
  }, [tracking.status])

  // Abandon the countdown or take if the camera stops. An error (lost camera,
  // failed tracker) says so; the learner's own Stop needs no message.
  useEffect(() => {
    if (
      tracking.status !== 'running' &&
      (phaseRef.current === 'countdown' || phaseRef.current === 'recording')
    ) {
      window.clearInterval(countdownRef.current)
      framesRef.current = []
      setPhase('idle')
      if (tracking.status === 'error') {
        setCaptureNotice('The camera stopped, so that take was not scored. Try again.')
      }
    }
  }, [tracking.status])

  // Wall-clock backstop: frames normally finish the take at captureMs, but if
  // they stop arriving the take still ends instead of recording forever.
  useEffect(() => {
    if (phase !== 'recording') return
    return captureDeadline(captureMs + BACKSTOP_SLACK_MS, () => finishRef.current())
  }, [phase, captureMs])

  // Tracking pauses while the tab is hidden, so a take running then would be
  // scored on a gap. Abandon it instead.
  useEffect(() => {
    const abandon = () => {
      if (!document.hidden) return
      if (phaseRef.current !== 'countdown' && phaseRef.current !== 'recording') return
      window.clearInterval(countdownRef.current)
      framesRef.current = []
      setPhase('idle')
      setCaptureNotice('You left the page, so that take was not scored. Try again.')
    }
    document.addEventListener('visibilitychange', abandon)
    return () => document.removeEventListener('visibilitychange', abandon)
  }, [])

  useEffect(() => () => window.clearInterval(countdownRef.current), [])

  const { pause: pauseTracking, resume: resumeTracking } = tracking
  useEffect(() => {
    if (phase === 'result' || isBrowsing || !selected) {
      pauseTracking()
      resetReady()
    } else resumeTracking()
  }, [phase, isBrowsing, selected, pauseTracking, resumeTracking])

  useEffect(() => {
    if (session) saveSession(session)
    else clearSession()
  }, [session])

  // A notice belongs to the sign it happened on.
  useEffect(() => setCaptureNotice(null), [selected])

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
    if (phase === 'idle' && captureNotice) return captureNotice
    if (phase === 'result' && result) {
      const bandLabel = band(result.score).label
      const hint = result.hints[0] ? ` ${result.hints[0]}` : ''
      return `${selectedRef.current?.gloss ?? 'Sign'} scored ${result.score} out of 100. ${bandLabel}.${hint}`
    }
    return ''
  }, [phase, result, captureNotice])

  useEffect(() => {
    if (phase === 'result') retryRef.current?.focus({ preventScroll: true })
  }, [phase])

  useEffect(() => {
    if (sessionDone && phase === 'idle') completeRef.current?.focus({ preventScroll: true })
  }, [sessionDone, phase])

  function beginCountdown() {
    if (tracking.status !== 'running' || !referenceRef.current) return
    setCaptureNotice(null)
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

  /** Record (button or Space) from idle: only once the learner's hands are tracked. */
  function recordFromIdle() {
    if (!handsReadyRef.current) return
    beginCountdown()
  }

  function cancelCountdown() {
    window.clearInterval(countdownRef.current)
    setPhase('idle')
  }

  /** Esc while recording: discard the take unscored and stay on this sign. */
  function cancelRecording() {
    framesRef.current = []
    startTsRef.current = null
    lastFrameAtRef.current = null
    setElapsedMs(0)
    setPhase('idle')
  }

  function finishRecording() {
    if (phaseRef.current !== 'recording') return
    const currentRef = referenceRef.current
    const captured = framesRef.current
    framesRef.current = []
    // Score the tracked span only, as references are built (see trimTake).
    // A take with no hand at all keeps its frames: nothing to trim to.
    const trimmed = trimTake(captured)
    const frames = trimmed.length > 0 ? trimmed : captured
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

    if (!shouldLogAttempt(scored)) return

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
  finishRef.current = finishRecording

  const noAttemptHands =
    result != null && result.hands.length > 0 && result.hands.every((h) => h.missing)

  const resultNotes = result ? result.hints.filter((h) => !h.startsWith('Check your ')) : []

  // Measured per-hand scores for ScoreBadge. When the take was scored
  // mirrored, the learner signed with the other hand than the reference's, so
  // each score is labelled with the learner's hand.
  const handFeedback: HandFeedback[] = useMemo(() => {
    if (!result) return []
    return result.hands.map((h) => ({
      handedness: result.mirrored ? (h.handedness === 'Left' ? 'Right' : 'Left') : h.handedness,
      score: h.score,
      missing: h.missing,
    }))
  }, [result])

  const fingerFocus = result ? topFingers(result) : []

  const progress = useMemo(() => {
    if (!result || !selected || !attempt) return { delta: null, best: false }
    return progressAgainstEarlier(entries, selected.gloss, attempt.id, result.score)
  }, [entries, result, selected, attempt])

  useEffect(() => {
    if (selected) setIsBrowsing(false)
  }, [selected])

  // First run: the guide opens on the learner's first sign, once.
  useEffect(() => {
    if (isBrowsing || !selected || firstRunCheckedRef.current) return
    firstRunCheckedRef.current = true
    if (!onboardingSeen()) setOnboardingOpen(true)
  }, [isBrowsing, selected])

  const closeOnboarding = useCallback(() => setOnboardingOpen(false), [])

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

  // Global keyboard shortcuts. The handler is rebuilt every render (it reads
  // fresh state) but registered once, through a ref, so the listener does not
  // churn with the tracking object. It listens in the capture phase so that
  // its preventDefault reaches AppNavBar's window listener (registered earlier,
  // bubble phase) before that one sends Esc to the Hero.
  const keyHandlerRef = useRef<(e: KeyboardEvent) => void>(() => {})
  keyHandlerRef.current = (e: KeyboardEvent) => {
    // The guide is modal: no Practice shortcut runs behind it. Esc is taken
    // here (so AppNavBar does not send it to the Hero) and closes the guide.
    if (onboardingOpen) {
      if (e.key === 'Escape') {
        e.preventDefault()
        setOnboardingOpen(false)
      }
      return
    }
    const key = e.code === 'Space' ? ' ' : e.key
    // A focused button or link keeps Enter/Space; text fields keep every key.
    if (shortcutBlockedByTarget(key, e.target)) return

    if (key === ' ') {
      if (phaseRef.current === 'idle' && !isBrowsing && referenceRef.current && tracking.status === 'running') {
        e.preventDefault()
        recordFromIdle()
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
      } else if (phaseRef.current === 'recording') {
        e.preventDefault()
        cancelRecording()
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
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => keyHandlerRef.current(e)
    window.addEventListener('keydown', onKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true })
  }, [])

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
                    {/* glossLabel() already carries the English meaning */}
                    <h2 className="aww-pane-title">
                      {glossLabel(selected.gloss)}
                    </h2>
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
              <div className="aww-you-row">
                <p className="aww-pane-label">{browsing ? 'Preview' : 'You'}</p>
                {!browsing && (
                  <button
                    type="button"
                    className="aww-how-link"
                    onClick={() => setOnboardingOpen(true)}
                  >
                    How it works
                  </button>
                )}
              </div>
              {browsing && previewRec && (
                <h2 className="aww-pane-title">{glossLabel(previewRec.gloss)}</h2>
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

          {!browsing && phase === 'idle' && captureNotice && (
            <p className="aww-cam-notice">{captureNotice}</p>
          )}

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
                  <>
                    <button
                      className="aww-cam-btn"
                      onClick={recordFromIdle}
                      disabled={!reference || !handsReady}
                      aria-label="Record attempt (Space)"
                      aria-describedby="aww-hands-pill"
                    >
                      <Circle size={14} fill="currentColor" strokeWidth={0} aria-hidden="true" />
                      <span>{reference ? 'Record' : 'Loading…'}</span>
                      <span className="aww-key-badge-sm">Space</span>
                    </button>
                    <span
                      id="aww-hands-pill"
                      className="aww-hands-pill"
                      data-ready={handsReady ? 'yes' : 'no'}
                    >
                      <span className="aww-hands-dot" aria-hidden="true" />
                      {handsReady ? 'Hands in frame' : 'Show your hands'}
                    </span>
                  </>
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
                  hands={handFeedback}
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
      <Onboarding open={onboardingOpen} onClose={closeOnboarding} />
    </div>
  )
}
