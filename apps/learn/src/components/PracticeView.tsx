import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useHandTracking } from '../vision/useHandTracking'
import type { HandFrame, RecordingMeta, SignRecording } from '../vision/types'
import { toMeta } from '../vision/types'
import { listRecordings } from '../storage/recordingStore'
import { loadReferenceFrames, loadReferenceIndex } from '../storage/bundledReferences'
import { pickReferenceList } from '../storage/references'
import { categoriesIn, categoryOf } from '../data/categories'
import { glossLabel, matchesSearch } from '../data/translations'
import { addAttempt, listAttempts } from '../learner/attemptLog'
import type { AttemptLogEntry } from '../learner/attemptLog'
import { summarizeAll } from '../learner/mastery'
import {
  SESSION_SIZE,
  buildSession,
  clearSession,
  currentGloss,
  isComplete,
  loadSession,
  markAttempted,
  saveSession,
  startSession,
} from '../learner/session'
import type { PracticeSession } from '../learner/session'
import { scoreAttempt, topFingers } from '../scoring/score'
import type { ScoreResult } from '../scoring/score'
import { FINGER_LABEL } from '../scoring/landmarks'
import { useFeedbackLatency } from '../metrics/useFeedbackLatency'
import { CameraStage } from './CameraStage'
import { SkeletonPlayer } from './SkeletonPlayer'
import { ScoreBadge } from './ScoreBadge'
import { STACKED_LAYOUT, useMediaQuery } from './useMediaQuery'

const COUNTDOWN_S = 3

/** How many results the picker renders at once. 358 buttons is a lot of DOM to
 *  scroll past; searching is faster than scrolling once a list is this long. */
const PICKER_LIMIT = 60

type Phase = 'idle' | 'countdown' | 'recording' | 'result'

/**
 * The correction from the last scored attempt, kept alive across a retry.
 *
 * Corrective feedback only teaches anything if it is available *during* the
 * corrected performance. The result panel unmounts the moment a retry starts,
 * so without this the score, the hints and the finger chips vanish at exactly
 * the moment the learner is trying to act on them.
 */
interface Coaching {
  gloss: string
  score: number
  hint: string | null
  worstFingers: ReturnType<typeof topFingers>
}

/**
 * Graded practice: choose a sign, watch the reference, record an attempt, and
 * get a DTW match score with corrective hints and a side-by-side replay.
 */
export function PracticeView() {
  // The picker runs entirely on metadata — 220 KB for all 362 signs. Only the
  // selected sign's frames are fetched, because only it is replayed and scored.
  const [references, setReferences] = useState<RecordingMeta[]>([])
  const [localRecs, setLocalRecs] = useState<SignRecording[]>([])
  const [selected, setSelected] = useState<RecordingMeta | null>(null)
  const [reference, setReference] = useState<SignRecording | null>(null)
  const [refFailed, setRefFailed] = useState(false)
  const [phase, setPhaseState] = useState<Phase>('idle')
  const [count, setCount] = useState(COUNTDOWN_S)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [result, setResult] = useState<ScoreResult | null>(null)
  // Deliberately NOT cleared by beginCountdown — only a newer score replaces it.
  const [lastResult, setLastResult] = useState<Coaching | null>(null)
  const [attempt, setAttempt] = useState<SignRecording | null>(null)
  const [entries, setEntries] = useState<AttemptLogEntry[]>([])
  const [suggested, setSuggested] = useState<string | null>(null)
  const [logFailed, setLogFailed] = useState(false)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  // The picker is a disclosure, not permanent panel furniture.
  const [pickerOpen, setPickerOpen] = useState(false)
  // A finite set of signs with an end, so practice has a unit of work. Survives
  // a reload; the attempt log stays the source of truth for progress.
  const [session, setSession] = useState<PracticeSession | null>(() => loadSession())

  const phaseRef = useRef<Phase>('idle')
  const setPhase = (p: Phase) => {
    phaseRef.current = p
    setPhaseState(p)
  }
  const selectedRef = useRef<RecordingMeta | null>(null)
  selectedRef.current = selected
  // Scoring needs the frames, not just the metadata, and finishRecording runs
  // outside React's render so it reads them through a ref.
  const referenceRef = useRef<SignRecording | null>(null)
  referenceRef.current = reference
  const framesRef = useRef<HandFrame[]>([])
  const startTsRef = useRef<number | null>(null)
  const countdownRef = useRef(0)
  const didPreselectRef = useRef(false)
  const retryRef = useRef<HTMLButtonElement>(null)
  const completeRef = useRef<HTMLHeadingElement>(null)
  // Absolute capture time of the newest frame, kept before the buffer rewrites
  // timestamps to be take-relative. It is where the feedback-latency clock
  // starts — see metrics/latency.ts.
  const lastFrameAtRef = useRef<number | null>(null)

  // Act 1 is the commit that gets measured: final score, final hints, nothing
  // moving. Act 2 is everything expressive, released one frame later by
  // useFeedbackLatency once the sample has been taken. See its doc comment.
  const [revealArmed, setRevealArmed] = useState(false)
  const latency = useFeedbackLatency('practice', () => setRevealArmed(true))

  // Where the reference replay lives. Stacked (phone) it goes inside the camera
  // stage, so the learner can watch it and stay in frame at once; side by side
  // it stays in the panel, which already has room for it and its transport.
  const stacked = useMediaQuery(STACKED_LAYOUT)

  // Capture a bit longer than the reference so a slightly slower attempt fits.
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
    setLastResult(null)
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
    // Pre-select the suggestion once, so the learner can start straight away
    // without stealing their choice on later re-ranks.
    if (!didPreselectRef.current) {
      didPreselectRef.current = true
      setSelected((cur) => cur ?? references.find((r) => r.gloss === next) ?? null)
    }
  }, [references, entries, categoryFor])

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
    if (phase === 'result') pauseTracking()
    else resumeTracking()
  }, [phase, pauseTracking, resumeTracking])

  useEffect(() => {
    if (session) saveSession(session)
    else clearSession()
  }, [session])

  function selectGloss(gloss: string | null) {
    if (!gloss) return
    const next = references.find((r) => r.gloss === gloss)
    if (next) setSelected(next)
  }

  function beginSession(glosses?: string[]) {
    const summaries = summarizeAll(
      references.map((r) => r.gloss),
      entries,
    )
    // "Practise these again" keeps the same set; a fresh session re-ranks.
    const next = glosses
      ? {
          // Same signs, but a new sitting — so a new session id.
          id: crypto.randomUUID(),
          glosses,
          done: [],
          startedAt: new Date().toISOString(),
          startMastery: Object.fromEntries(
            summaries.filter((s) => glosses.includes(s.gloss)).map((s) => [s.gloss, s.mastery]),
          ),
        }
      : startSession(summaries, SESSION_SIZE, new Date(), categoryFor)
    setSession(next)
    selectGloss(next.glosses[0] ?? null)
  }

  /** Leave the result view without touching the session. */
  function leaveResult() {
    setResult(null)
    setAttempt(null)
    setRevealArmed(false)
    setPhase('idle')
  }

  // Per-sign change over the session, from the log rather than anything the
  // session stores about how well it went.
  const sessionDeltas = useMemo(() => {
    if (!session) return []
    return summarizeAll(session.glosses, entries).map((s) => {
      const before = session.startMastery[s.gloss] ?? 0
      return { gloss: s.gloss, before, after: s.mastery, delta: s.mastery - before }
    })
  }, [session, entries])

  const bestGain = sessionDeltas.reduce<(typeof sessionDeltas)[number] | null>(
    (best, d) => (d.delta > 0 && (!best || d.delta > best.delta) ? d : best),
    null,
  )

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
    setLastResult({
      gloss: reference.gloss,
      score: scored.score,
      hint: scored.hints[0] ?? null,
      worstFingers: topFingers(scored),
    })
    setRevealArmed(false)
    setPhase('result')
    // One scored attempt completes a session sign, whatever the score.
    setSession((prev) => (prev ? markAttempted(prev, reference.gloss) : prev))

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
    setLogFailed(false)
    addAttempt(entry).catch((e: unknown) => {
      // Never fail silently: a lost attempt means wrong mastery and progress.
      console.error('Failed to save attempt to the log', e)
      setLogFailed(true)
    })
    // The suggestion effect re-ranks off the new log.
    setEntries((prev) => [...prev, entry])
  }

  const noAttemptHands = result != null && result.hands.every((h) => h.missing)
  const inputsLocked = phase === 'countdown' || phase === 'recording'

  // The picker holds every reference (80+ once more of the dataset is
  // converted), so it is searchable and grouped rather than one flat list.
  const categories = useMemo(() => categoriesIn(references), [references])
  const visible = useMemo(() => {
    const needle = query.trim()
    return references.filter(
      (r) =>
        (category === null || categoryOf(r) === category) &&
        // Matches the gloss or its English meaning, so a learner can find
        // KANAWA by typing "eat".
        matchesSearch(r.gloss, needle),
    )
  }, [references, query, category])

  return (
    <div className="record-layout" data-phase={phase}>
      <section className="camera-card">
        <CameraStage
          videoRef={tracking.videoRef}
          canvasRef={tracking.canvasRef}
          status={tracking.status}
          error={tracking.error}
          onStart={() => void tracking.start()}
          idleHint="Start the camera, choose a sign, and record your attempt."
          inferring={tracking.inferring}
          pip={
            stacked && reference && phase !== 'result' ? (
              <SkeletonPlayer
                frames={reference.frames}
                videoWidth={reference.videoWidth}
                videoHeight={reference.videoHeight}
              />
            ) : undefined
          }
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
                <div style={{ transform: `scaleX(${Math.min(elapsedMs / captureMs, 1)})` }} />
              </div>
            </>
          )}
        </CameraStage>

        <div className="camera-bar">
          {tracking.status === 'running' ? (
            <>
              <button
                className="btn btn-ghost"
                onClick={tracking.stop}
                disabled={phase === 'countdown' || phase === 'recording'}
              >
                Stop camera
              </button>
              {tracking.stats && (
                <span className="camera-stats">
                  {tracking.stats.fps.toFixed(0)} fps · {tracking.stats.inferenceMs.toFixed(1)} ms
                </span>
              )}
            </>
          ) : (
            <span className="camera-stats">Tracking runs entirely in your browser.</span>
          )}
        </div>
      </section>

      <aside className="record-panel" data-reveal={revealArmed ? 'on' : undefined}>
        {/* Polite, so it never interrupts something the learner is already
            being told; the score is not urgent enough to warrant assertive. */}
        <p className="sr-only" role="status">
          {liveMessage}
        </p>

        {phase === 'result' && result ? (
          <>
            <h2>{selected?.gloss}</h2>
            <div className="result-top">
              <ScoreBadge score={result.score} />
              <div className="result-detail">
                <ul className="hint-list">
                  {result.hints.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
                {/* Beside the score rather than below two skeleton players:
                    retrying is the whole loop, and it was previously the last
                    control on a long panel. */}
                <div className="row-buttons">
                  <button
                    ref={retryRef}
                    className="btn"
                    onClick={beginCountdown}
                    disabled={tracking.status !== 'running'}
                  >
                    Try again
                  </button>
                  {session &&
                    (isComplete(session) ? (
                      <button className="btn btn-ghost" onClick={leaveResult}>
                        See summary
                      </button>
                    ) : (
                      <button
                        className="btn btn-ghost"
                        onClick={() => {
                          leaveResult()
                          selectGloss(currentGloss(session))
                        }}
                      >
                        Next sign
                      </button>
                    ))}
                </div>
              </div>
            </div>

            {result.mirrored && (
              <p className="hint-text">
                Scored as a mirrored (left-dominant) rendition — that's a valid way to sign it.
              </p>
            )}
            {logFailed && (
              <p className="camera-error">
                This attempt couldn't be saved, so it won't count towards your progress.
              </p>
            )}

            {noAttemptHands ? (
              <p className="camera-error">
                No hands were tracked in your attempt — check your framing and lighting, then try
                again.
              </p>
            ) : (
              topFingers(result).length > 0 && (
                <div className="finger-chips">
                  {topFingers(result).map((f) => (
                    <span key={f} className="finger-chip">
                      {FINGER_LABEL[f]}
                    </span>
                  ))}
                </div>
              )
            )}

            <div className="compare-grid">
              <div>
                <p className="compare-label">Reference</p>
                {reference && (
                  <SkeletonPlayer
                    frames={reference.frames}
                    videoWidth={reference.videoWidth}
                    videoHeight={reference.videoHeight}
                  />
                )}
              </div>
              <div>
                <p className="compare-label">Your attempt</p>
                {attempt && (
                  <SkeletonPlayer
                    frames={attempt.frames}
                    videoWidth={attempt.videoWidth}
                    videoHeight={attempt.videoHeight}
                  />
                )}
              </div>
            </div>

            <div className="row-buttons">
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setResult(null)
                  setAttempt(null)
                  setLastResult(null)
                  setRevealArmed(false)
                  setPhase('idle')
                }}
              >
                Pick another sign
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Carries the last correction through the countdown and the take,
                so the learner is reading the fix while performing it. */}
            {lastResult && (
              <div className="coach-strip">
                <span className="coach-head">
                  <span className="rec-gloss">{glossLabel(lastResult.gloss)}</span>
                  <span className="coach-score">last {lastResult.score}</span>
                </span>
                {lastResult.worstFingers.length > 0 && (
                  <span className="coach-fix">
                    fix {lastResult.worstFingers.map((f) => FINGER_LABEL[f]).join(', ')}
                  </span>
                )}
                {lastResult.hint && <p className="coach-hint">{lastResult.hint}</p>}
              </div>
            )}

            {sessionDone && session ? (
              <div className="session-complete">
                <h2 ref={completeRef} tabIndex={-1}>
                  Session complete
                </h2>
                <p className="hint-text">
                  You practised {session.glosses.length} signs. Mastery is a recency-weighted
                  estimate from your scores, so it moves with your latest attempts.
                </p>
                <ul className="mastery-list">
                  {sessionDeltas.map((d) => (
                    <li className="mastery-row" key={d.gloss}>
                      <span className="rec-gloss">{glossLabel(d.gloss)}</span>
                      <div className="mastery-bar">
                        <div style={{ width: `${Math.round(d.after * 100)}%` }} />
                      </div>
                      <span className="mastery-pct">{Math.round(d.after * 100)}%</span>
                      <span className="mastery-meta">
                        {d.delta >= 0 ? '+' : ''}
                        {Math.round(d.delta * 100)} pts
                      </span>
                    </li>
                  ))}
                </ul>
                {bestGain && (
                  <p className="hint-text">
                    Biggest gain: <strong>{glossLabel(bestGain.gloss)}</strong>, up{' '}
                    {Math.round(bestGain.delta * 100)} points.
                  </p>
                )}
                <div className="row-buttons">
                  <button className="btn" onClick={() => beginSession()}>
                    Start a new session
                  </button>
                  <button className="btn btn-ghost" onClick={() => beginSession(session.glosses)}>
                    Practise these again
                  </button>
                  <button className="btn btn-ghost" onClick={() => setSession(null)}>
                    Free practice
                  </button>
                </div>
              </div>
            ) : session ? (
              <div className="session-bar">
                <div className="turn-progress" aria-hidden="true">
                  {session.glosses.map((g) => (
                    <span
                      key={g}
                      className={
                        session.done.includes(g)
                          ? 'done'
                          : g === currentGloss(session)
                            ? 'active'
                            : ''
                      }
                    />
                  ))}
                </div>
                <p className="session-line">
                  Sign {Math.min(session.done.length + 1, session.glosses.length)} of{' '}
                  {session.glosses.length} — <strong>{glossLabel(currentGloss(session) ?? '')}</strong>
                </p>
                {/* Never a trap: the way out is always one click away. */}
                <button className="link-button" onClick={() => setSession(null)}>
                  End session
                </button>
              </div>
            ) : (
              references.length > 0 && (
                <div className="session-bar">
                  <p className="session-line">
                    Practise the {SESSION_SIZE} signs that need it most, then stop.
                  </p>
                  <button className="btn" onClick={() => beginSession()}>
                    Start a session
                  </button>
                </div>
              )
            )}

            {!sessionDone && (
              <>
                {references.length === 0 ? (
                  <>
                    <h2>Practice a sign</h2>
                    <p className="hint-text">
                      No reference signs yet. Record some in the <strong>Record</strong> tab first —
                      start with ME, YOU, NAME.
                    </p>
                  </>
                ) : pickerOpen ? (
                  /* The picker takes the panel while it is open, rather than
                     living permanently above the reference and the record
                     button. Before, 358 chips sat in a 168px nested scroll
                     inside the page scroll, and the primary action was below
                     all of it. */
                  <div className="picker">
                    <div className="picker-head">
                      <h2>Choose a sign</h2>
                      <button className="btn btn-ghost" onClick={() => setPickerOpen(false)}>
                        Cancel
                      </button>
                    </div>

                    <input
                      type="search"
                      className="picker-search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={`Search ${references.length} signs…`}
                      aria-label="Search signs"
                      autoFocus
                    />

                    {categories.length > 1 && (
                      /* One scrolling row rather than eighteen wrapping chips
                         taking six lines of the panel. */
                      <div className="category-rail">
                        <button
                          className={category === null ? 'chip active' : 'chip'}
                          onClick={() => setCategory(null)}
                        >
                          All {references.length}
                        </button>
                        {categories.map((name) => (
                          <button
                            key={name}
                            className={category === name ? 'chip active' : 'chip'}
                            onClick={() => setCategory(name)}
                          >
                            {name} {references.filter((r) => categoryOf(r) === name).length}
                          </button>
                        ))}
                      </div>
                    )}

                    {visible.length === 0 ? (
                      <p className="hint-text">No signs match “{query}”.</p>
                    ) : (
                      <>
                        <ul className="sign-list">
                          {visible.slice(0, PICKER_LIMIT).map((r) => (
                            <li key={r.id}>
                              <button
                                className={selected?.id === r.id ? 'sign-row active' : 'sign-row'}
                                onClick={() => {
                                  setSelected(r)
                                  setPickerOpen(false)
                                }}
                              >
                                {/* The meaning, not just the dataset label — a
                                    learner cannot act on a bare gloss. */}
                                <span className="sign-row-name">{glossLabel(r.gloss)}</span>
                                <span className="sign-row-meta">
                                  {r.gloss === suggested && <em className="badge">suggested</em>}
                                  {categoryOf(r)}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                        <p className="hint-text">
                          {visible.length > PICKER_LIMIT
                            ? `Showing ${PICKER_LIMIT} of ${visible.length} — search to narrow it down.`
                            : `${visible.length} sign${visible.length === 1 ? '' : 's'}.`}
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    <h2>Practice a sign</h2>

                    <div className="sign-header">
                      <p className="sign-name">
                        {selected ? glossLabel(selected.gloss) : 'No sign chosen yet'}
                        {selected && selected.gloss === suggested && ' ★'}
                      </p>
                      <button
                        className="btn btn-ghost"
                        onClick={() => setPickerOpen(true)}
                        disabled={inputsLocked}
                      >
                        {selected ? 'Change sign' : 'Choose a sign'}
                      </button>
                    </div>

                    {selected?.provisional && (
                      <p className="provisional-note">
                        Provisional reference — recorded by the team to unblock development, not
                        verified SSL.
                      </p>
                    )}

                    {selected && suggested && selected.gloss !== suggested && (
                      <p className="hint-text">
                        Suggested next:{' '}
                        <button
                          className="link-button"
                          onClick={() => {
                            const next = references.find((r) => r.gloss === suggested)
                            if (next) setSelected(next)
                          }}
                          disabled={inputsLocked}
                        >
                          {glossLabel(suggested)} ★
                        </button>
                      </p>
                    )}

                    {selected &&
                      (reference ? (
                        // Stacked, the player itself is in the camera stage.
                        !stacked && (
                          <SkeletonPlayer
                            frames={reference.frames}
                            videoWidth={reference.videoWidth}
                            videoHeight={reference.videoHeight}
                          />
                        )
                      ) : refFailed ? (
                        <p className="camera-error">
                          Could not load this reference recording. Pick another sign, or check your
                          connection and select it again.
                        </p>
                      ) : (
                        <p className="hint-text">Loading reference…</p>
                      ))}

                    <p className="hint-text">
                      Watch the reference, then record yourself signing it. You'll get a match
                      score and tips on what to fix.
                    </p>
                  </>
                )}

                {/* Last in the panel so it can stick to the bottom of the
                    viewport on a phone, within thumb reach, instead of landing
                    hundreds of pixels below the fold. Hidden while the picker
                    is open, which owns the panel for as long as it is up. */}
                <div className="panel-actions" hidden={pickerOpen}>
                  {phase === 'countdown' ? (
                    <button className="btn btn-ghost" onClick={cancelCountdown}>
                      Cancel
                    </button>
                  ) : phase === 'recording' ? (
                    <button className="btn" onClick={finishRecording}>
                      Stop &amp; score
                    </button>
                  ) : (
                    <button
                      className="btn"
                      onClick={beginCountdown}
                      disabled={tracking.status !== 'running' || !reference}
                      title={
                        tracking.status !== 'running'
                          ? 'Start the camera first'
                          : !selected
                            ? 'Choose a sign first'
                            : refFailed
                              ? 'This reference could not be loaded'
                              : !reference
                                ? 'Loading the reference recording…'
                                : undefined
                      }
                    >
                      Record attempt
                    </button>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </aside>
    </div>
  )
}
