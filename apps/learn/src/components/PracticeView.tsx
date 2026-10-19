import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Circle,
  Grid,
  RotateCcw,
  Square,
  X,
  Brain,
  Camera,
  Check,
  Eye,
  Hand,
  Lock,
  Play,
  ShieldCheck,
  Star,
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
import { summarizeAll, summarizeGloss } from '../learner/mastery'
import {
  buildSession,
  clearSession,
  currentGloss,
  isComplete,
  loadSession,
  markAttempted,
  saveSession,
} from '../learner/session'
import type { PracticeSession } from '../learner/session'
import { scoreAttempt, topFingers } from '../scoring/score'
import type { ScoreResult } from '../scoring/score'
import { band } from '../scoring/band'
import { useFeedbackLatency } from '../metrics/useFeedbackLatency'
import { drawHands, wristAnchorFit } from '../vision/drawing'
import type { Fit } from '../vision/drawing'
import { CameraStage } from './CameraStage'
import { SkeletonPlayer } from './SkeletonPlayer'
import { ScoreBadge } from './ScoreBadge'
import type { HandFeedback } from './ScoreBadge'
import { PracticeBrowser } from './PracticeBrowser'
import { practiceReturnCategory } from './practiceBrowserNavigation'
import { Onboarding } from './Onboarding'
import { onboardingSeen } from './onboardingFlag'
import { trimTake } from '../scoring/trimTake'
import { shortcutBlockedByTarget } from '../app/keyboard'
import { captureDeadline } from '../vision/cameraLifecycle'
import { progressAgainstEarlier, shouldLogAttempt } from '../learner/attemptProgress'
import './PracticeView.css'
import { initialPracticeStage, practiceStageTransition } from './practiceStages'
import { starsFor } from '../learner/game'
import { nextExercise } from '../learner/nextExercise'
import { SessionComplete } from './SessionComplete'
import { clearHeroSession, readHeroSession } from '../learner/heroSession'
import { cameraIntentTransition, initialCameraIntent } from './practiceCamera'
import type { PracticeCameraEvent } from './practiceCamera'
import { ReplayCompare } from './ReplayCompare'
import { feedbackTip } from './feedbackTips'
import { calibratedFingerStates } from '../scoring/fingerStates'

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
  const [teaching, setTeaching] = useState(initialPracticeStage)
  const recallHidden = teaching.stage === 'recall' && !teaching.revealed && phase !== 'result'
  const [count, setCount] = useState(COUNTDOWN_S)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [result, setResult] = useState<ScoreResult | null>(null)
  const [attempt, setAttempt] = useState<SignRecording | null>(null)
  const [entries, setEntries] = useState<AttemptLogEntry[]>([])
  const [suggested, setSuggested] = useState<string | null>(null)
  const [session, setSession] = useState<PracticeSession | null>(() => {
    const saved = readHeroSession() ?? loadSession()
    // An explicit sign entry must not get trapped behind an old completion.
    return initialGloss && saved && (isComplete(saved) || !saved.glosses.includes(initialGloss))
      ? null
      : saved
  })
  const [loadingProgress, setLoadingProgress] = useState(true)
  const mountIntent = useRef({ gloss: initialGloss, session })
  const [isBrowsing, setIsBrowsing] = useState(true)
  const [browserStartCategory, setBrowserStartCategory] = useState<string | null>(null)
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
  // The learner's hands in the latest tracked frame, for anchoring the ghost.
  const liveHandsRef = useRef<HandFrame['hands']>([])
  const ghostRafRef = useRef(0)

  // Explicit previews use one native dialog on pointer, keyboard and touch.
  const [previewSign, setPreviewSign] = useState<RecordingMeta | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewFrames, setPreviewFrames] = useState<SignRecording | null>(null)
  const [previewFailed, setPreviewFailed] = useState(false)
  const previewDialogRef = useRef<HTMLDialogElement>(null)
  const lessonHeadingRef = useRef<HTMLHeadingElement>(null)
  const [referenceExpanded, setReferenceExpanded] = useState(false)

  useEffect(() => {
    const dialog = previewDialogRef.current
    if (previewOpen && previewSign) dialog?.showModal()
    else if (dialog?.open) dialog.close()
  }, [previewOpen, previewSign])

  useEffect(() => {
    if (!isBrowsing && selected) {
      setBrowserStartCategory(null)
      lessonHeadingRef.current?.focus({ preventScroll: true })
      window.scrollTo({ top: 0 })
    }
  }, [isBrowsing, selected])

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
  const resultHeadingRef = useRef<HTMLHeadingElement>(null)
  const completeRef = useRef<HTMLHeadingElement>(null)
  const lastFrameAtRef = useRef<number | null>(null)
  const finishRef = useRef<() => void>(() => {})

  const [revealArmed, setRevealArmed] = useState(false)
  const latency = useFeedbackLatency('practice', () => setRevealArmed(true))

  // Long enough for a hesitant start; the take is trimmed to its tracked span
  // before scoring, so the extra hands-down time does not count against it.
  const captureMs = selected ? Math.max(2 * selected.durationMs, selected.durationMs + 3000) : 3500

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
    liveHandsRef.current = frame.hands
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

  const cameraIntent = useRef(initialCameraIntent(document.hidden))
  const cameraControls = useRef({ start: tracking.start, stop: tracking.stop })
  cameraControls.current = { start: tracking.start, stop: tracking.stop }
  const cameraSurface = useRef(false)
  cameraSurface.current = !isBrowsing && selected !== null && teaching.stage !== 'watch'
  const issueCameraIntent = useCallback((event: PracticeCameraEvent) => {
    const next = cameraIntentTransition(cameraIntent.current, event)
    cameraIntent.current = next.state
    if (next.action === 'start') void cameraControls.current.start()
    if (next.action === 'stop') {
      cameraControls.current.stop()
      handStreakRef.current = 0
      handsReadyRef.current = false
      setHandsReady(false)
    }
  }, [])
  const requestCamera = useCallback(() => issueCameraIntent('start'), [issueCameraIntent])
  const stopCamera = useCallback(() => issueCameraIntent('stop'), [issueCameraIntent])

  useEffect(() => {
    if (!cameraSurface.current) issueCameraIntent('leave-surface')
  }, [isBrowsing, selected, teaching.stage, issueCameraIntent])
  useEffect(() => {
    if (tracking.status === 'error') issueCameraIntent('failed')
  }, [tracking.status, issueCameraIntent])
  useEffect(() => {
    const away = () => {
      if (phaseRef.current === 'countdown' || phaseRef.current === 'recording') {
        window.clearInterval(countdownRef.current)
        framesRef.current = []
        setPhase('idle')
        setCaptureNotice('You left the page, so that take was not scored. Try again.')
      }
      issueCameraIntent('away')
    }
    const returned = () => {
      if (document.hidden) return
      if (!cameraSurface.current) issueCameraIntent('leave-surface')
      issueCameraIntent('return')
    }
    const visibility = () => {
      if (document.hidden) away()
      else returned()
    }
    document.addEventListener('visibilitychange', visibility)
    window.addEventListener('pagehide', away)
    window.addEventListener('pageshow', returned)
    window.addEventListener('focus', returned)
    return () => {
      document.removeEventListener('visibilitychange', visibility)
      window.removeEventListener('pagehide', away)
      window.removeEventListener('pageshow', returned)
      window.removeEventListener('focus', returned)
      cameraIntent.current = initialCameraIntent()
    }
  }, [issueCameraIntent])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      // allSettled: a failed IndexedDB (blocked site storage) must not blank
      // the bundled signs. Each store that fails contributes nothing.
      const [locR, indexR, logR] = await Promise.allSettled([
        Promise.resolve().then(listRecordings),
        loadReferenceIndex(),
        Promise.resolve().then(listAttempts),
      ])
      if (cancelled) return
      const loc = locR.status === 'fulfilled' ? locR.value : []
      const index = indexR.status === 'fulfilled' ? indexR.value : []
      const log = logR.status === 'fulfilled' ? logR.value : []
      for (const r of [locR, indexR, logR]) {
        if (r.status === 'rejected') console.error('Practice could not load a store', r.reason)
      }
      setLocalRecs(loc)
      const refs = pickReferenceList([...loc.map(toMeta), ...index])
      setReferences(refs)
      setEntries(log)
      if (!mountIntent.current.gloss) {
        const active = mountIntent.current.session
        const first = active ? currentGloss(active) : null
        const rec = refs.find((item) => item.gloss === first)
        if (rec) {
          setSelected(rec)
          setIsBrowsing(false)
        }
      }
      clearHeroSession()
      setLoadingProgress(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Fetch reference frames for the selected sign
  useEffect(() => {
    setTeaching(initialPracticeStage())
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
      setPreviewSign(null)
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
    const summaries = summarizeAll(
      references.map((r) => r.gloss),
      entries,
    )
    const next = buildSession(summaries, 1, new Date(), categoryFor)[0] ?? null
    setSuggested(next)
  }, [references, entries, categoryFor])

  const previewRec = previewSign

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
    setPreviewFrames(null)
    setPreviewFailed(false)
    void (async () => {
      const full = previewRec.file
        ? await loadReferenceFrames(previewRec.file)
        : (localRecs.find((r) => r.id === previewRec.id) ?? null)
      if (!cancelled) {
        setPreviewFrames(full)
        setPreviewFailed(!full)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [previewRec, selected, reference, localRecs])

  // Ghost Mode animation loop on webcam overlay canvas
  useEffect(() => {
    const canvas = ghostCanvasRef.current
    if (
      !canvas ||
      !ghostActive ||
      recallHidden ||
      !reference ||
      tracking.status !== 'running' ||
      phase === 'result'
    ) {
      if (canvas) {
        const ctx = canvas.getContext('2d')
        ctx?.clearRect(0, 0, canvas.width, canvas.height)
      }
      return
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const video = tracking.videoRef.current
    const duration = Math.max(reference.durationMs, 1000)
    const startTime = performance.now()
    // The reference's first tracked hands are its anchor; references are
    // trimmed, so this is normally frame 0.
    const anchorHands = reference.frames.find((f) => f.hands.length > 0)?.hands ?? []
    let fit: Fit | undefined
    let anchoredLoop = -1

    const loop = () => {
      // Draw in the camera's own pixel space: the ghost canvas sits on the
      // video with the same object-fit and mirroring, so a landmark lands where
      // the same point of the video is. Re-checked each frame in case the
      // camera changes resolution.
      if (
        video?.videoWidth &&
        (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight)
      ) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
      }
      const total = performance.now() - startTime
      const loopIndex = Math.floor(total / duration)
      const elapsed = total % duration
      // Anchor once per loop, so the reference's own movement still shows; and
      // as soon as the learner's hand appears, if it was missing at loop start.
      if (loopIndex !== anchoredLoop || (fit === undefined && liveHandsRef.current.length > 0)) {
        anchoredLoop = loopIndex
        fit =
          liveHandsRef.current.length > 0
            ? wristAnchorFit(anchorHands, liveHandsRef.current)
            : undefined
      }
      let idx = 0
      while (
        idx + 1 < reference.frames.length &&
        reference.frames[idx + 1].timestampMs <= elapsed
      ) {
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
  }, [ghostActive, recallHidden, reference, tracking.status, tracking.videoRef, phase])

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
      if (tracking.status === 'error' || tracking.status === 'interrupted') {
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
    if (phase === 'result' || isBrowsing || !selected || teaching.stage === 'watch') {
      pauseTracking()
      resetReady()
    } else resumeTracking()
  }, [phase, isBrowsing, selected, teaching.stage, tracking.status, pauseTracking, resumeTracking])

  useLayoutEffect(() => {
    if (phase !== 'result' || !result) return
    let second = 0
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => {
        if (!document.hidden) performance.mark('suvana:result-shown')
      })
    })
    return () => {
      cancelAnimationFrame(first)
      cancelAnimationFrame(second)
    }
  }, [phase, result])

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
      const hint = result.typedHints?.[0] ? ` ${feedbackTip(result.typedHints[0])}` : ''
      return `${selectedRef.current?.gloss ?? 'Sign'} scored ${result.score} out of 100. ${bandLabel}.${hint}`
    }
    return ''
  }, [phase, result, captureNotice])

  useEffect(() => {
    if (phase === 'result') {
      const heading = resultHeadingRef.current
      heading?.closest('.aww-practice-env')?.scrollTo({ top: 0 })
      window.scrollTo({ top: 0 })
      heading?.focus({ preventScroll: true })
    }
  }, [phase])

  useEffect(() => {
    if (sessionDone && phase === 'idle') completeRef.current?.focus({ preventScroll: true })
  }, [sessionDone, phase])

  function beginCountdown() {
    if (teaching.stage === 'watch') return
    if (phaseRef.current === 'result')
      setTeaching((state) => practiceStageTransition(state, 'retry'))
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

  function retryAttempt() {
    if (tracking.status === 'running') beginCountdown()
    else {
      setTeaching((state) => practiceStageTransition(state, 'retry'))
      leaveResult()
      requestCamera()
    }
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
    performance.clearMarks('suvana:capture-end')
    performance.clearMarks('suvana:result-shown')
    performance.mark('suvana:capture-end')
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
      stage: teaching.stage === 'recall' ? 'recall' : 'try',
      revealed: teaching.stage === 'recall' ? teaching.revealed : undefined,
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

  const resultTips = result
    ? (result.typedHints ?? [{ kind: 'compare-reference' } as const]).slice(0, 2).map(feedbackTip)
    : []

  // Measured per-hand scores for ScoreBadge. When the take was scored
  // mirrored, the learner signed with the other hand than the reference's, so
  // each score is labelled with the learner's hand.
  const handFeedback: HandFeedback[] = useMemo(() => {
    if (!result) return []
    return result.hands.map((h) => ({
      handedness: result.mirrored ? (h.handedness === 'Left' ? 'Right' : 'Left') : h.handedness,
      score: h.score,
      missing: h.missing,
      fingers: reference ? calibratedFingerStates(h, reference) : [],
    }))
  }, [result, reference])

  // L-33/D-A31: calibrated reference IDs only; scores/replay remain unchanged.
  const fadeTips = useMemo(
    () =>
      selected
        ? ['improving', 'mastered'].includes(summarizeGloss(selected.gloss, entries).level)
        : false,
    [selected, entries],
  )

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
  const returnCategory = useMemo(
    () => practiceReturnCategory(selected, references),
    [selected, references],
  )
  const watching = teaching.stage === 'watch'
  const exercise = selected ? nextExercise(selected.gloss, entries) : null
  const earnedStars = selected ? starsFor(selected.gloss, entries) : 0
  const starsAdded =
    selected && attempt
      ? Math.max(
          0,
          earnedStars -
            starsFor(
              selected.gloss,
              entries.filter((entry) => entry.id !== attempt.id),
            ),
        )
      : 0
  const recallUnlocked = earnedStars >= 2

  function enterRecall() {
    if (!recallUnlocked || watching) return
    const retry = phaseRef.current === 'result'
    leaveResult()
    setTeaching((state) =>
      state.stage === 'recall' && retry
        ? practiceStageTransition(state, 'retry')
        : practiceStageTransition(state, 'recall', recallUnlocked),
    )
  }

  function watchAgain() {
    leaveResult()
    setTeaching((state) => practiceStageTransition(state, 'watch'))
  }

  // Cycle to next sign (suggested or next in category list)
  const handleNextSign = useCallback(() => {
    if (references.length === 0) return
    let targetRec: RecordingMeta | null = null

    if (session) {
      const next = currentGloss(session)
      leaveResult()
      if (next) setSelected(references.find((rec) => rec.gloss === next) ?? null)
      else setIsBrowsing(true)
      return
    }

    if (suggested && (!selected || suggested !== selected.gloss)) {
      targetRec = references.find((r) => r.gloss === suggested) ?? null
    }

    if (!targetRec && selected) {
      const cat = categoryOf(selected)
      const catSigns = orderSigns(
        cat,
        references.filter((r) => categoryOf(r) === cat),
      )
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
  }, [references, suggested, selected, session])

  // Cycle previous sign in category
  const handlePrevSign = useCallback(() => {
    if (!selected || references.length === 0) return
    const cat = categoryOf(selected)
    const catSigns = orderSigns(
      cat,
      references.filter((r) => categoryOf(r) === cat),
    )
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
    if (e.defaultPrevented) return
    // The preview is a native modal: keep practice and tab shortcuts behind it.
    if (previewDialogRef.current?.open) {
      if (e.key === 'Escape') {
        e.preventDefault()
        setPreviewOpen(false)
        setPreviewSign(null)
      }
      return
    }
    const key = e.code === 'Space' ? ' ' : e.key
    // A focused button or link keeps Enter/Space; text fields keep every key.
    if (shortcutBlockedByTarget(key, e.target)) return

    if (key === ' ') {
      if (
        phaseRef.current === 'idle' &&
        !isBrowsing &&
        referenceRef.current &&
        tracking.status === 'running'
      ) {
        e.preventDefault()
        recordFromIdle()
      } else if (phaseRef.current === 'recording') {
        e.preventDefault()
        finishRecording()
      } else if (phaseRef.current === 'result') {
        e.preventDefault()
        retryAttempt()
      }
    } else if (e.key === 'ArrowLeft') {
      if (phaseRef.current === 'result') {
        e.preventDefault()
        retryAttempt()
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
        returnToCategory()
      } else if (phaseRef.current === 'idle' && !isBrowsing) {
        e.preventDefault()
        returnToCategory()
      }
    } else if (e.key === 'm' || e.key === 'M') {
      if (!isBrowsing && !watching && !recallHidden && phaseRef.current !== 'result') {
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

  function chooseSign(sign: RecordingMeta) {
    leaveResult()
    setTeaching(initialPracticeStage())
    setSelected(sign)
    setIsBrowsing(false)
    setPreviewSign(null)
    setPreviewOpen(false)
    setReferenceExpanded(false)
  }

  function browseSigns() {
    leaveResult()
    setBrowserStartCategory(null)
    setIsBrowsing(true)
    window.scrollTo({ top: 0 })
  }

  function returnToCategory() {
    leaveResult()
    setBrowserStartCategory(returnCategory)
    setIsBrowsing(true)
    window.scrollTo({ top: 0 })
  }

  const busy = phase === 'countdown' || phase === 'recording'
  const reason = session?.recommendations?.find((item) => item.gloss === selected?.gloss)?.reason
  const resultActions = (
    <div className="practice-result-actions">
      <button
        className="practice-button practice-primary"
        onClick={retryAttempt}
        aria-label={
          tracking.status === 'running' ? 'Retry attempt (Left Arrow or Space)' : 'Turn on camera'
        }
      >
        <RotateCcw size={16} aria-hidden="true" />
        {tracking.status === 'running' ? 'Try again' : 'Turn on camera'}
      </button>
      <button
        className="practice-button practice-secondary"
        onClick={handleNextSign}
        aria-label="Next sign (Right Arrow or Enter)"
      >
        Next sign <ArrowRight size={16} aria-hidden="true" />
      </button>
      <button
        className="practice-text-button"
        onClick={browseSigns}
        aria-label="Browse signs (Esc)"
      >
        <Grid size={15} aria-hidden="true" /> All signs
      </button>
    </div>
  )

  if (sessionDone && phase === 'idle' && session && browsing && browserStartCategory === null)
    return loadingProgress ? (
      <p role="status" className="empty-state">
        Loading your session…
      </p>
    ) : (
      <SessionComplete
        session={session}
        attempts={entries}
        onContinue={() => {
          setSession(null)
          clearSession()
          setSelected(null)
          setBrowserStartCategory(null)
          setIsBrowsing(true)
        }}
      />
    )

  const referencePlayer = recallHidden ? (
    <div className="practice-memory-cue">
      <span className="practice-cue-icon">
        <Brain size={30} aria-hidden="true" />
      </span>
      <p className="practice-kicker">A little less help</p>
      <h2>What do you remember?</h2>
      <p>Try the sign from memory. Your reference is tucked away.</p>
      <button
        className="practice-button practice-secondary"
        onClick={() => setTeaching((state) => practiceStageTransition(state, 'reveal'))}
      >
        <Eye size={16} aria-hidden="true" /> Reveal reference
      </button>
      <small>Revealing costs the third star for this try.</small>
    </div>
  ) : reference ? (
    <SkeletonPlayer
      key={`${selected?.id}-${teaching.stage}`}
      frames={reference.frames}
      videoWidth={reference.videoWidth}
      videoHeight={reference.videoHeight}
      colorOverride="#e6eeec"
    />
  ) : (
    <div className="practice-empty" role="status">
      <p>{refFailed ? 'Could not load this reference.' : 'Loading reference…'}</p>
      {refFailed && (
        <button
          className="practice-button practice-secondary"
          onClick={() => {
            if (selected) setSelected({ ...selected })
          }}
        >
          Try loading again
        </button>
      )}
    </div>
  )

  return (
    <div
      className={`aww-practice-env practice-workspace${browsing ? ' practice-is-browsing' : ''}`}
      data-phase={phase}
      data-stage={teaching.stage}
      data-preview={previewOpen && previewRec ? 'open' : 'closed'}
    >
      {browsing ? (
        <PracticeBrowser
          references={references}
          loading={loadingProgress}
          initialCategory={browserStartCategory}
          initialSignId={browserStartCategory ? selected?.id : undefined}
          onSelect={chooseSign}
          onPreview={(sign) => {
            setPreviewSign(sign)
            setPreviewOpen(true)
          }}
        />
      ) : (
        selected && (
          <>
            <header className="practice-lesson-header">
              <div className="practice-lesson-identity">
                <button
                  className="practice-text-button"
                  disabled={busy}
                  onClick={returnToCategory}
                  aria-label={
                    returnCategory ? `Back to ${returnCategory} (Esc)` : 'Browse signs (Esc)'
                  }
                >
                  <ArrowLeft size={15} aria-hidden="true" /> {returnCategory ?? 'All signs'}
                </button>
              </div>
              {!watching && (
                <button
                  className="practice-text-button"
                  disabled={busy}
                  onClick={() => setOnboardingOpen(true)}
                >
                  <span className="practice-help-icon">?</span> How it works
                </button>
              )}
            </header>

            <div className="practice-lesson-title">
              <div>
                {!watching && (
                  <p className="practice-kicker">
                    {phase === 'result'
                      ? 'Practice review'
                      : teaching.stage === 'recall'
                        ? 'From memory'
                        : 'Make it your turn'}
                  </p>
                )}
                <h1 ref={lessonHeadingRef} tabIndex={-1}>
                  {translationOf(selected.gloss) ?? glossLabel(selected.gloss)}
                </h1>
                {translationOf(selected.gloss) && (
                  <span className="practice-gloss">{selected.gloss}</span>
                )}
              </div>
              <div className="practice-earned" aria-label={`${earnedStars} of 3 stars`}>
                <span>
                  {[0, 1, 2].map((index) => (
                    <Star
                      key={index}
                      size={19}
                      aria-hidden="true"
                      fill={index < earnedStars ? 'currentColor' : 'none'}
                      data-earned={index < earnedStars}
                    />
                  ))}
                </span>
                <small>
                  {earnedStars === 3 ? 'All stars earned' : `${earnedStars} of 3 stars`}
                </small>
              </div>
            </div>

            <nav className="practice-stepper" aria-label="Practice steps">
              <button aria-pressed={watching} disabled={busy} onClick={watchAgain}>
                <span className="practice-step-icon">
                  {!watching ? (
                    <Check size={16} aria-hidden="true" />
                  ) : (
                    <Play size={16} aria-hidden="true" />
                  )}
                </span>
                <span>Watch</span>
                <small aria-hidden="true">01</small>
              </button>
              <button
                aria-pressed={teaching.stage === 'try'}
                disabled={watching || busy}
                onClick={() => {
                  leaveResult()
                  setTeaching((state) => practiceStageTransition(state, 'my-turn'))
                }}
              >
                <span className="practice-step-icon">
                  <Hand size={17} aria-hidden="true" />
                </span>
                <span>Try</span>
                <small aria-hidden="true">02</small>
              </button>
              <button
                aria-pressed={teaching.stage === 'recall'}
                disabled={!recallUnlocked || watching || busy}
                onClick={enterRecall}
                title={recallUnlocked ? 'Practise from memory' : 'Earn 2 stars to unlock Recall'}
              >
                <span className="practice-step-icon">
                  {recallUnlocked ? (
                    <Brain size={17} aria-hidden="true" />
                  ) : (
                    <Lock size={15} aria-hidden="true" />
                  )}
                </span>
                <span>Recall</span>
                <small aria-hidden="true">03</small>
              </button>
            </nav>

            {reason && !recallHidden && (
              <details className="practice-why">
                <summary>Why this sign?</summary>
                <p>{reason}</p>
              </details>
            )}

            {phase !== 'result' && (
              <div className={`practice-stage-layout${watching ? ' practice-stage-watch' : ''}`}>
                <section
                  className="practice-reference-card"
                  aria-label="Sign reference"
                  data-expanded={referenceExpanded || watching || recallHidden}
                >
                  <div className="practice-card-heading">
                    <span className="practice-kicker">
                      {recallHidden ? 'Reference hidden' : 'The reference'}
                    </span>
                    <span className="practice-subtle-label">
                      {watching ? 'Watch at your own pace' : 'Here when you need it'}
                    </span>
                  </div>
                  {!watching && !recallHidden && (
                    <button
                      className="practice-reference-toggle practice-text-button"
                      onClick={() => setReferenceExpanded((value) => !value)}
                      aria-expanded={referenceExpanded}
                    >
                      <Eye size={16} aria-hidden="true" />
                      {referenceExpanded ? 'Hide reference' : 'Show reference'}
                    </button>
                  )}
                  <div className="practice-reference-body">{referencePlayer}</div>
                  {!recallHidden && (
                    <p className="practice-reference-note">
                      Slow it down or replay as often as you like.
                    </p>
                  )}
                </section>

                {watching && (
                  <aside className="practice-watch-next">
                    <span className="practice-cue-icon">
                      <Hand size={28} aria-hidden="true" />
                    </span>
                    <h2>
                      Find the movement.
                      <br />
                      Take your time.
                    </h2>
                    <p>
                      Follow the reference with your eyes. When you’re ready, practise with your
                      camera.
                    </p>
                    <button
                      className="practice-button practice-primary"
                      aria-label="Try this sign"
                      disabled={!reference}
                      onClick={() =>
                        setTeaching((state) => practiceStageTransition(state, 'my-turn'))
                      }
                    >
                      Try <ArrowRight size={17} aria-hidden="true" />
                    </button>
                    <span className="practice-private">
                      <ShieldCheck size={15} aria-hidden="true" /> Your camera stays private
                    </span>
                    <button
                      className="practice-text-button practice-watch-help"
                      onClick={() => setOnboardingOpen(true)}
                    >
                      <span className="practice-help-icon" aria-hidden="true">
                        ?
                      </span>{' '}
                      How it works
                    </button>
                  </aside>
                )}
              </div>
            )}

            {/* Keep the video mounted through Watch / results so tracking retains its refs. */}
            <section
              className="practice-camera-card"
              hidden={watching || phase === 'result'}
              aria-label="Your practice camera"
              data-camera-status={tracking.status}
            >
              <div className="practice-card-heading">
                <span className="practice-kicker">
                  <Camera size={15} aria-hidden="true" /> Your turn
                </span>
                <span className="practice-subtle-label">
                  {teaching.stage === 'recall' ? 'Try it from memory' : 'Follow the reference'}
                </span>
              </div>
              <div className="practice-camera-surface">
                <CameraStage
                  videoRef={tracking.videoRef}
                  canvasRef={tracking.canvasRef}
                  ghostCanvasRef={ghostCanvasRef}
                  status={tracking.status}
                  prepareTracker={!browsing && !watching}
                  error={tracking.error}
                  onStart={requestCamera}
                  onStop={stopCamera}
                  ghostActive={ghostActive && !recallHidden}
                  onToggleGhost={() => setGhostActive((value) => !value)}
                  ghostAvailable={reference !== null && !recallHidden}
                  idleHint=""
                  inferring={tracking.inferring}
                  intro={
                    <div className="practice-camera-intro">
                      <span className="practice-cue-icon">
                        <Camera size={28} aria-hidden="true" />
                      </span>
                      <h2>Ready when you are.</h2>
                      <p>
                        Turn on your camera to practise.
                        <br />
                        Your video stays on this device.
                      </p>
                      <button
                        className="practice-button practice-primary"
                        onClick={() => requestCamera()}
                      >
                        <Camera size={17} aria-hidden="true" /> Turn on camera
                      </button>
                    </div>
                  }
                />
                {tracking.status === 'running' && (
                  <>
                    {phase === 'countdown' && (
                      <div className="practice-countdown" aria-hidden="true">
                        <span>{count}</span>
                        <small>Get ready</small>
                      </div>
                    )}
                    {phase === 'recording' && (
                      <div className="practice-recording-status">
                        <span /> Signing · {(elapsedMs / 1000).toFixed(1)}s
                      </div>
                    )}
                  </>
                )}
              </div>
              {captureNotice && phase === 'idle' && (
                <p className="practice-capture-notice" role="status">
                  {captureNotice}
                </p>
              )}
              {tracking.status === 'running' && (
                <div className="practice-capture-controls">
                  {phase === 'idle' && (
                    <>
                      <span
                        id="aww-hands-pill"
                        className="practice-hands-pill"
                        data-ready={handsReady ? 'yes' : 'no'}
                      >
                        <span />
                        {handsReady ? 'Hands in frame' : 'Show your hands'}
                      </span>
                      <button
                        className="practice-button practice-primary aww-cam-btn"
                        onClick={recordFromIdle}
                        disabled={!reference || !handsReady}
                        aria-label="Record attempt (Space)"
                        aria-describedby="aww-hands-pill"
                      >
                        <Circle size={13} fill="currentColor" aria-hidden="true" /> Record{' '}
                        <kbd>Space</kbd>
                      </button>
                    </>
                  )}
                  {phase === 'countdown' && (
                    <button
                      className="practice-button practice-secondary"
                      onClick={cancelCountdown}
                      aria-label="Cancel countdown (Esc)"
                    >
                      <X size={16} aria-hidden="true" /> Cancel countdown
                    </button>
                  )}
                  {phase === 'recording' && (
                    <>
                      <button className="practice-text-button" onClick={cancelRecording}>
                        Discard
                      </button>
                      <button
                        className="practice-button practice-primary"
                        onClick={finishRecording}
                        aria-label="Stop and score (Space)"
                      >
                        <Square size={13} fill="currentColor" aria-hidden="true" /> Stop &amp; score
                      </button>
                    </>
                  )}
                </div>
              )}
              <p className="practice-camera-note">
                <ShieldCheck size={14} aria-hidden="true" /> Hand tracking runs in your browser. No
                video is uploaded.
              </p>
            </section>

            {phase === 'result' && result && (
              <section
                className="practice-review"
                data-reveal={revealArmed ? 'on' : undefined}
                aria-label="Practice result"
              >
                {noAttemptHands ? (
                  <div className="practice-no-hands">
                    <span className="practice-cue-icon">
                      <Hand size={30} aria-hidden="true" />
                    </span>
                    <h2 ref={resultHeadingRef} tabIndex={-1}>
                      Couldn't see your hands
                    </h2>
                    <p>That try could not be tracked. Adjust your setup and try again.</p>
                    <ul>
                      <li>Keep a light in front of you.</li>
                      <li>Move back so your hands fit in the camera view.</li>
                      <li>Keep your hands visible while you sign.</li>
                    </ul>
                    {resultActions}
                  </div>
                ) : (
                  <>
                    <div className="practice-review-heading">
                      <div>
                        <p className="practice-kicker">A moment to reflect</p>
                        <h2 ref={resultHeadingRef} tabIndex={-1}>
                          Your try, side by side.
                        </h2>
                      </div>
                      <p>
                        Compare the movement.
                        <br />
                        Then give it another go.
                      </p>
                    </div>
                    <div className="practice-review-grid">
                      <div className="practice-review-replay">
                        {reference && attempt && (
                          <ReplayCompare
                            key={attempt.id}
                            reference={reference}
                            attempt={attempt}
                            result={result}
                          />
                        )}
                      </div>
                      <aside className="practice-review-feedback">
                        <ScoreBadge
                          score={result.score}
                          delta={progress.delta}
                          best={progress.best}
                          hands={handFeedback}
                        />
                        <p className="practice-score-note">
                          Match against this reference, not a measure of language ability.
                        </p>
                        <div className="practice-next-advice">
                          <p className="practice-stars-summary">
                            <Star size={16} aria-hidden="true" /> {earnedStars} of 3 stars{' '}
                            <span>+{starsAdded} this try</span>
                          </p>
                          <p>
                            {exercise?.stage === 'recall'
                              ? 'Ready to practise from memory.'
                              : exercise?.suggestedSpeed === 0.25
                                ? 'Watch again at quarter speed. You can turn on the hand guide too.'
                                : 'Watch again, or give it another try.'}
                          </p>
                          {teaching.stage === 'recall' && teaching.revealed && (
                            <p>This revealed try cannot add the third star.</p>
                          )}
                        </div>
                        <details className="practice-tips" key={attempt?.id} open={!fadeTips}>
                          <summary>Tips for your next try</summary>
                          {resultTips.map((tip, index) => (
                            <p key={index}>{tip}</p>
                          ))}
                        </details>
                      </aside>
                    </div>
                    <div className="practice-review-footer">
                      {resultActions}
                      <div className="practice-review-secondary">
                        <button className="practice-text-button" onClick={watchAgain}>
                          <Eye size={16} aria-hidden="true" /> Watch again
                        </button>
                        {recallUnlocked && (
                          <button className="practice-text-button" onClick={enterRecall}>
                            <Brain size={16} aria-hidden="true" /> Try from memory
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </section>
            )}
          </>
        )
      )}

      <dialog
        className="practice-preview-dialog"
        ref={previewDialogRef}
        aria-label="Sign preview"
        onCancel={(event) => {
          event.preventDefault()
          setPreviewOpen(false)
          setPreviewSign(null)
        }}
      >
        <div className="practice-preview-heading">
          <div>
            <p className="practice-kicker">A quick look</p>
            <h2>{previewRec ? glossLabel(previewRec.gloss) : 'Sign preview'}</h2>
          </div>
          <button
            className="practice-icon-button"
            onClick={() => {
              setPreviewOpen(false)
              setPreviewSign(null)
            }}
            aria-label="Close preview"
          >
            <X size={19} />
          </button>
        </div>
        {previewFrames ? (
          <SkeletonPlayer
            key={previewRec?.id}
            frames={previewFrames.frames}
            videoWidth={previewFrames.videoWidth}
            videoHeight={previewFrames.videoHeight}
            colorOverride="#e6eeec"
          />
        ) : (
          <p className="practice-empty" role="status">
            {previewFailed
              ? 'Could not load this preview. Close it and try again.'
              : 'Loading reference…'}
          </p>
        )}
        <div className="practice-preview-footer">
          <button
            className="practice-button practice-primary"
            disabled={!previewRec || !previewFrames}
            onClick={() => {
              if (previewRec) chooseSign(previewRec)
            }}
          >
            Watch this sign <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
      </dialog>
      <p className="sr-only" role="status">
        {liveMessage}
      </p>
      <Onboarding open={onboardingOpen} onClose={closeOnboarding} />
    </div>
  )
}
