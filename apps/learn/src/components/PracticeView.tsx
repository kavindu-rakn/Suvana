import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useHandTracking } from '../vision/useHandTracking'
import type { HandFrame, RecordingMeta, SignRecording } from '../vision/types'
import { toMeta } from '../vision/types'
import { listRecordings } from '../storage/recordingStore'
import { loadReferenceFrames, loadReferenceIndex } from '../storage/bundledReferences'
import { pickReferenceList } from '../storage/references'
import { categoryOf } from '../data/categories'
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
import { ChevronLeft, Circle, Square, X } from 'lucide-react'
import { useFeedbackLatency } from '../metrics/useFeedbackLatency'
import { CameraStage } from './CameraStage'
import { SkeletonPlayer } from './SkeletonPlayer'
import { ScoreBadge } from './ScoreBadge'
import { CategorySignNavigator } from './CategorySignNavigator'

const COUNTDOWN_S = 3

type Phase = 'idle' | 'countdown' | 'recording' | 'result'

export function PracticeView() {
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

  // While browsing, the right pane previews a sign instead of sitting empty:
  // whatever the learner is pointing at, falling back to the selected or
  // suggested sign.
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

  // Fetch the frames for whichever sign is selected. A bundled reference comes
  // from public/references/ (cached module-side); the learner's own recordings
  // are already in memory from the initial IndexedDB read.
  useEffect(() => {
    setReference(null)
    setRefFailed(false)
    // A correction belongs to the sign it was given for.
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

  // Category lookup for the practice ranking's tie-break. It only separates
  // signs the model rates equally — see buildSession.
  const categoryFor = useCallback(
    (gloss: string) => {
      const rec = references.find((r) => r.gloss === gloss)
      return rec ? categoryOf(rec) : 'Other'
    },
    [references],
  )

  // Keep the suggestion in step with the log — it changes on load and after
  // every scored attempt. Sourced from buildSession rather than suggestNext so
  // the sign named here is the one a session would actually open on.
  useEffect(() => {
    if (references.length === 0) return
    const summaries = summarizeAll(references.map((r) => r.gloss), entries)
    const next = buildSession(summaries, 1, new Date(), categoryFor)[0] ?? null
    setSuggested(next)
  }, [references, entries, categoryFor])

  // What the browsing preview shows: the sign under the pointer, else the one
  // already selected. Deliberately NOT the suggestion — landing in Practice
  // straight from the hero should be a calm blank pane, not an animation the
  // learner didn't ask for. The skeleton appears when they hover a sign.
  const previewRec = hoverRec ?? selected

  // Load frames for the preview. loadReferenceFrames is module-cached, so
  // re-hovering a sign is instant; only the first look at one fetches.
  useEffect(() => {
    if (!previewRec) {
      setPreviewFrames(null)
      return
    }
    // Reuse the already-loaded reference when the preview is the selected sign.
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

  // Abandon a take if the camera stops mid-recording.
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

  // Nothing consumes frames while a result is on screen, and inference is the
  // most expensive thing on the page. Handing that budget back is what lets the
  // score reveal animate smoothly on a low-end device. The camera stays live,
  // so resuming is instant.
  const { pause: pauseTracking, resume: resumeTracking } = tracking
  useEffect(() => {
    // Also paused while browsing: the camera pane is hidden behind the sign
    // preview then, so there is nothing to infer for.
    if (phase === 'result' || isBrowsing || !selected) pauseTracking()
    else resumeTracking()
  }, [phase, isBrowsing, selected, pauseTracking, resumeTracking])

  useEffect(() => {
    if (session) saveSession(session)
    else clearSession()
  }, [session])

  /** Leave the result view without touching the session. */
  function leaveResult() {
    setResult(null)
    setAttempt(null)
    setRevealArmed(false)
    setPhase('idle')
  }

  // Per-sign change over the session, from the log rather than anything the
  // session stores about how well it went.

  const sessionDone = session !== null && isComplete(session)

  /**
   * What a screen reader hears as the take progresses. None of this had any
   * non-visual representation: the countdown was a number painted over video,
   * the recording state a coloured badge, and the score an SVG.
   *
   * Deliberately derived from the phase rather than the frame clock, so it
   * changes a handful of times per attempt instead of thirty times a second —
   * a live region that updates per frame is unusable.
   */
  const liveMessage = useMemo(() => {
    if (phase === 'countdown') return `Get ready. Recording starts in ${COUNTDOWN_S} seconds.`
    if (phase === 'recording') return 'Recording. Sign now.'
    if (phase === 'result' && result) {
      const band =
        result.score >= 85 ? 'Great match' : result.score >= 60 ? 'Getting there' : 'Keep practising'
      const hint = result.hints[0] ? ` ${result.hints[0]}` : ''
      return `${selectedRef.current?.gloss ?? 'Sign'} scored ${result.score} out of 100. ${band}.${hint}`
    }
    return ''
  }, [phase, result])

  // The result panel replaces the picker wholesale, which leaves keyboard focus
  // on a button that no longer exists — a screen-reader user is stranded at the
  // document root. Put focus on the action they are most likely to want next.
  // preventScroll because on a phone the panel is below a sticky camera and
  // yanking it into view would undo that.
  useEffect(() => {
    if (phase === 'result') retryRef.current?.focus({ preventScroll: true })
  }, [phase])

  // The completion card replaces the picker in the same way, so focus needs the
  // same treatment — otherwise finishing a session drops you at the page top.
  useEffect(() => {
    if (sessionDone && phase === 'idle') completeRef.current?.focus({ preventScroll: true })
  }, [sessionDone, phase])

  function beginCountdown() {
    // Frames must be in hand before the take starts — there is nothing to score
    // against otherwise, and the countdown would strand the learner.
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
    const reference = referenceRef.current
    const frames = framesRef.current
    framesRef.current = []
    if (!reference) {
      setPhase('idle')
      return
    }
    const durationMs = Math.max(frames[frames.length - 1]?.timestampMs ?? 0, 1)
    const video = tracking.videoRef.current
    const att: SignRecording = {
      id: crypto.randomUUID(),
      gloss: reference.gloss,
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
    const scored = scoreAttempt(att, reference)
    const scoreEndAt = performance.now()
    setAttempt(att)
    setResult(scored)
    // Survives the next retry, so the learner signs while reading the fix.
    setRevealArmed(false)
    setPhase('result')

    // A take with no frames has no capture instant to measure from, so it is
    // left unsampled rather than recorded as an implausibly fast one.
    if (captureAt !== null) {
      latency.arm(
        { captureAt, scoreStartAt, scoreEndAt },
        {
          id: att.id,
          gloss: reference.gloss,
          frameCount: frames.length,
          createdAt: att.createdAt,
        },
      )
    } else {
      // Nothing to measure, so nothing will release the reveal — do it here, or
      // this attempt's result would sit frozen in its pre-animation state.
      requestAnimationFrame(() => setRevealArmed(true))
    }

    // A take the tracker never saw a hand in is a capture failure, not a
    // performance. Recording it as a 0 would sink mastery and make the next
    // real attempt read as a huge jump "since your last try". Show the
    // framing guidance (the result view branches on this), but keep it out of
    // the log and don't count it toward the session.
    if (scored.hands.length > 0 && scored.hands.every((h) => h.missing)) return

    // One scored attempt completes a session sign, whatever the score.
    setSession((prev) => (prev ? markAttempted(prev, reference.gloss) : prev))

    // Log the attempt: feeds mastery/suggestions now, error mining later.
    const entry: AttemptLogEntry = {
      id: att.id,
      gloss: reference.gloss,
      referenceId: reference.id,
      score: scored.score,
      worstFingers: topFingers(scored),
      // Read before markAttempted runs, so an attempt that completes a session
      // is still attributed to it.
      sessionId: session?.id,
      createdAt: att.createdAt,
    }
    addAttempt(entry).catch((e: unknown) => {
      // Never fail silently: a lost attempt means wrong mastery and progress.
      console.error('Failed to save attempt to the log', e)
    })
    // The suggestion effect re-ranks off the new log.
    setEntries((prev) => [...prev, entry])
  }

  // A take the tracker never saw a hand in — a capture failure, not a 0/100
  // performance. `.every()` is true for an empty array, so guard the length.
  const noAttemptHands =
    result != null && result.hands.length > 0 && result.hands.every((h) => h.missing)

  // Finger feedback is shown once, as the Focus-on chips. The per-finger
  // "Check your X — its shape drifts" sentences are the same information in
  // prose, so they are filtered out of the notes here.
  const fingerFocus = result ? topFingers(result) : []
  const resultNotes = result ? result.hints.filter((h) => !h.startsWith('Check your ')) : []

  /**
   * How this attempt compares with the learner's own history for this sign.
   *
   * A bare score answers "how did I do" but not "am I getting better", which is
   * the question that keeps someone practising. The newest entry in the log is
   * this attempt — finishRecording appends it synchronously — so the one before
   * it is the comparison, and everything before that decides whether this is a
   * personal best.
   *
   * A linear scan of an in-memory array, and it runs on the frame
   * useFeedbackLatency measures: at pilot scale (tens to hundreds of attempts)
   * that is far below a frame budget, but it is the reason this is a plain
   * filter and not something that touches IndexedDB.
   */
  const progress = useMemo(() => {
    if (!result || !selected) return { delta: null as number | null, best: false }
    const forGloss = entries.filter((e) => e.gloss === selected.gloss)
const earlier = forGloss.slice(0, -1)
    if (earlier.length === 0) return { delta: null as number | null, best: false }
    const previous = earlier[earlier.length - 1].score
    const bestBefore = Math.max(...earlier.map((e) => e.score))
    return { delta: result.score - previous, best: result.score > bestBefore }
  }, [entries, result, selected])

  // If selected changes from outside or suggested, sync
  useEffect(() => {
    if (selected) setIsBrowsing(false)
  }, [selected])

  // Browsing: no sign committed yet. The split still shows, but the right pane
  // previews a sign instead of holding an empty camera stage.
  const browsing = isBrowsing || !selected

  // Shared by both result states. "Try again" runs the countdown, which needs a
  // live camera — if it dropped, offer to turn it back on rather than a button
  // that silently does nothing. retryRef takes focus when the result appears.
  const resultActions = (
    <div className="aww-result-actions">
      {tracking.status === 'running' ? (
        <button ref={retryRef} className="btn massive" onClick={beginCountdown}>
          Try again
        </button>
      ) : (
        <button ref={retryRef} className="btn massive" onClick={() => void tracking.start()}>
          Turn on camera
        </button>
      )}
      <button
        className="btn ghost massive"
        onClick={() => {
          leaveResult()
          setIsBrowsing(true)
        }}
      >
        Choose another sign
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
                  <button
                    className="aww-back-round"
                    onClick={() => setIsBrowsing(true)}
                    aria-label="Choose a different sign"
                  >
                    <ChevronLeft size={20} aria-hidden="true" />
                  </button>
                )}
                <div className="aww-ref-heading">
                  <p className="aww-pane-label">Reference</p>
                  <h2 className="aww-pane-title">
                    {glossLabel(selected.gloss)}
                    {selected.gloss === suggested && (
                      <span className="badge cs-suggested-chip" style={{ marginLeft: '8px', verticalAlign: 'middle' }}>Suggested</span>
                    )}
                  </h2>
                </div>
              </div>
              
              <div className="aww-pane-content">
                {reference ? (
                  <SkeletonPlayer
                    frames={reference.frames}
                    videoWidth={reference.videoWidth}
                    videoHeight={reference.videoHeight}
                    /* One bright neutral colour: the reference is a diagram to
                       copy, not a left/right-hand readout. --p-sage-050. */
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

           {/* Live Camera — always mounted (the hook owns the video element);
               hidden while browsing and during the result replay. */}
           <div
             className={`aww-camera-container ${browsing || phase === 'result' ? 'hidden' : ''}`}
           >
               <CameraStage
                 videoRef={tracking.videoRef}
                 canvasRef={tracking.canvasRef}
                 status={tracking.status}
                 error={tracking.error}
                 onStart={() => void tracking.start()}
                 idleHint=""
                 inferring={tracking.inferring}
                 intro={
                   <div className="aww-camera-intro">
                     <p className="aww-camera-intro-lead">Practise in front of your camera.</p>
                     <p className="aww-camera-intro-note">
                       Hand tracking runs entirely in your browser. No video is uploaded or
                       recorded.
                     </p>
                     <svg
                       className="aww-camera-intro-guide"
                       viewBox="0 0 120 96"
                       fill="none"
                       stroke="currentColor"
                       strokeWidth="2"
                       strokeLinecap="round"
                       strokeLinejoin="round"
                       aria-hidden="true"
                     >
                       <rect x="4" y="4" width="112" height="88" rx="10" opacity="0.35" />
                       <circle cx="60" cy="34" r="12" />
                       <path d="M38 74c4-13 13-20 22-20s18 7 22 20" />
                       <path d="M26 60h10M84 60h10" opacity="0.5" />
                     </svg>
                     <button className="btn massive" onClick={() => void tracking.start()}>
                       Turn on camera
                     </button>
                   </div>
                 }
               />
           </div>

           {/* Camera controls, anchored to this pane. One action button at a
               time: bottom-left; the countdown centres over the view, the
               recording timer sits top-right. */}
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
                   <button className="aww-cam-btn" onClick={beginCountdown} disabled={!reference}>
                     <Circle size={15} fill="currentColor" strokeWidth={0} aria-hidden="true" />
                     {reference ? 'Record attempt' : 'Loading…'}
                   </button>
                 )}
                 {phase === 'countdown' && (
                   <button className="aww-cam-btn aww-cam-btn-ghost" onClick={cancelCountdown}>
                     <X size={16} aria-hidden="true" />
                     Cancel
                   </button>
                 )}
                 {phase === 'recording' && (
                   <button className="aww-cam-btn aww-cam-btn-stop" onClick={finishRecording}>
                     <Square size={13} fill="currentColor" strokeWidth={0} aria-hidden="true" />
                     Stop &amp; Score
                   </button>
                 )}
               </div>
             </>
           )}

           {/* Replay Overlay */}
           {phase === 'result' && attempt && (
               <div className="aww-replay-container">
                   <SkeletonPlayer frames={attempt.frames} videoWidth={attempt.videoWidth} videoHeight={attempt.videoHeight} />
               </div>
           )}
        </div>

        {/* Centre result: a capture failure and a scored attempt are different
            outcomes and get different panels. */}
        {phase === 'result' && result && (
          <div className="aww-result-overlay" data-reveal={revealArmed ? 'on' : undefined}>
            {noAttemptHands ? (
              <div className="aww-result-panel aww-result-nohands">
                <p className="pane-label">Couldn't see your hands</p>
                <p className="aww-result-lead">The tracker didn't pick up a hand in that take.</p>
                <p>Move back so your hands and shoulders are in frame, and make sure the room is well lit.</p>
                {resultActions}
              </div>
            ) : (
              <div className="aww-result-panel">
                <ScoreBadge score={result.score} delta={progress.delta} best={progress.best} />
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

      {/* Live region for assistive tech — the countdown, recording state and
          score have no other non-visual representation. */}
      <p className="sr-only" role="status">{liveMessage}</p>
    </div>
  )
}
