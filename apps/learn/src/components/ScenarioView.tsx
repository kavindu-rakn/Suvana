import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSignCapture } from '../vision/useSignCapture'
import type { CapturedTake } from '../vision/useSignCapture'
import type { RecordingMeta, SignRecording } from '../vision/types'
import { toMeta } from '../vision/types'
import { listRecordings } from '../storage/recordingStore'
import { loadReferenceFrames, loadReferenceIndex } from '../storage/bundledReferences'
import { pickReferences } from '../storage/references'
import { addAttempt } from '../learner/attemptLog'
import { topFingers } from '../scoring/score'
import { useFeedbackLatency } from '../metrics/useFeedbackLatency'
import { scoreTurn } from '../scenario/rubric'
import type { TurnScore } from '../scenario/rubric'
import type { Scenario, ScenarioTurn } from '../scenario/types'
import { SCENARIOS } from '../data/scenarios'
import { ArrowRight, Circle, Lightbulb, Square, X } from 'lucide-react'
import { glossLabel } from '../data/translations'
import { CameraStage } from './CameraStage'
import { SkeletonPlayer } from './SkeletonPlayer'
import { ScoreBadge } from './ScoreBadge'
import { band } from '../scoring/band'
import { safeLoad } from '../storage/safeLoad'
import { StorageNotice } from '../storage/StorageNotice'
import { readMode } from '../app/mode'
import { scenarioHint } from '../scenario/hints'
import './ScenarioView.css'

type Stage = 'hub' | 'intro' | 'playing' | 'summary'

interface TurnOutcome {
  turn: ScenarioTurn
  score: TurnScore
  attempt: SignRecording
}

/**
 * Runs a scripted conversation scenario: each turn asks for one sign, scores it
 * through the existing DTW path, and reports against the proposal's rubric.
 */
export function ScenarioView() {
  const isAuthorMode = readMode() === 'author'
  const [storageOk, setStorageOk] = useState(true)
  const [scenarioId, setScenarioId] = useState<string>(SCENARIOS[0].id)
  const scenario: Scenario = SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[0]

  const [references, setReferences] = useState<Map<string, RecordingMeta>>(new Map())
  const [localRecs, setLocalRecs] = useState<SignRecording[]>([])
  const [vocab, setVocab] = useState<Map<string, SignRecording>>(new Map())
  const [loadingVocab, setLoadingVocab] = useState(false)
  const [loading, setLoading] = useState(true)
  const [recallMode, setRecallMode] = useState(false)
  const [stage, setStage] = useState<Stage>('hub')
  const [index, setIndex] = useState(0)
  const [outcomes, setOutcomes] = useState<TurnOutcome[]>([])
  const [current, setCurrent] = useState<TurnScore | null>(null)
  const [currentAttempt, setCurrentAttempt] = useState<SignRecording | null>(null)

  useEffect(() => {
    void (async () => {
      const { data: [local, refIndex], storageOk: ok } = await safeLoad(listRecordings, loadReferenceIndex)
      setStorageOk(ok)
      setLocalRecs(local)
      setReferences(pickReferences([...local.map(toMeta), ...refIndex]))
      setLoading(false)
    })()
  }, [])

  const playable = useMemo(
    () => scenario.turns.filter((t) => references.has(t.gloss)),
    [scenario.turns, references],
  )
  const pending = scenario.turns.filter((t) => !references.has(t.gloss))

  const turn: ScenarioTurn | undefined = playable[index]
  const reference = turn ? vocab.get(turn.gloss) : undefined
  const captureMs = reference ? Math.max(reference.durationMs + 1500, 2500) : 3500

  const scenarioVocabulary = useMemo(() => [...vocab.values()], [vocab])

  const [revealArmed, setRevealArmed] = useState(false)
  const latency = useFeedbackLatency('scenario', () => setRevealArmed(true))

  const stageHeadingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    stageHeadingRef.current?.focus({ preventScroll: true })
  }, [stage])

  const handleCaptured = useCallback(
    (take: CapturedTake) => {
      if (!turn || !reference) return
      const attempt: SignRecording = {
        id: crypto.randomUUID(),
        gloss: turn.gloss,
        signer: 'learner',
        createdAt: new Date().toISOString(),
        durationMs: take.durationMs,
        fps: Math.round((take.frames.length / take.durationMs) * 1000),
        videoWidth: take.videoWidth,
        videoHeight: take.videoHeight,
        frames: take.frames,
      }
      const scoreStartAt = performance.now()
      const score = scoreTurn(attempt, reference, scenarioVocabulary)
      const scoreEndAt = performance.now()

      // A take the tracker never saw a hand in is a capture failure, not a turn
      // score — don't let it into the outcomes (the summary average) or the log.
      const noHands =
        score.detail.hands.length > 0 && score.detail.hands.every((h) => h.missing)

      setRevealArmed(false)
      setCurrent(score)
      setCurrentAttempt(attempt)
      if (!noHands) {
        setOutcomes((prev) => [
          ...prev.filter((o) => o.turn.id !== turn.id),
          { turn, score, attempt },
        ])
      }

      if (take.lastFrameAt !== null) {
        latency.arm(
          { captureAt: take.lastFrameAt, scoreStartAt, scoreEndAt },
          {
            id: attempt.id,
            gloss: turn.gloss,
            frameCount: take.frames.length,
            createdAt: attempt.createdAt,
          },
        )
      } else {
        requestAnimationFrame(() => setRevealArmed(true))
      }

      if (!noHands) {
        addAttempt({
          id: attempt.id,
          gloss: turn.gloss,
          referenceId: reference.id,
          score: score.detail.score,
          worstFingers: topFingers(score.detail),
          createdAt: attempt.createdAt,
        }).catch((e: unknown) => console.error('Failed to log scenario attempt', e))
      }
    },
    [turn, reference, scenarioVocabulary, latency],
  )

  const capture = useSignCapture(handleCaptured)

  const liveMessage = useMemo(() => {
    if (capture.phase === 'countdown') return 'Get ready. Recording starts in 3 seconds.'
    if (capture.phase === 'recording') return 'Recording. Sign now.'
    if (current) {
      return `Scored ${current.rubric.total} out of 100.`
    }
    return ''
  }, [capture.phase, current])

  const stopTracking = capture.tracking.stop
  useEffect(() => {
    if (stage !== 'playing') stopTracking()
  }, [stage, stopTracking])

  const { pause: pauseTracking, resume: resumeTracking } = capture.tracking
  useEffect(() => {
    if (current) pauseTracking()
    else resumeTracking()
  }, [current, pauseTracking, resumeTracking])

  const loadVocabForPlayable = useCallback(
    async (targets = playable) => {
      setLoadingVocab(true)
      const metas = targets
        .map((t) => references.get(t.gloss))
        .filter((m): m is RecordingMeta => m !== undefined)
      const updated = new Map(vocab)
      await Promise.all(
        metas.map(async (m) => {
          if (updated.has(m.gloss)) return
          try {
            const full = m.file
              ? await loadReferenceFrames(m.file)
              : (localRecs.find((r) => r.id === m.id) ?? null)
            if (full) updated.set(m.gloss, full)
          } catch (e: unknown) {
            console.error(`Failed to load reference for ${m.gloss}`, e)
          }
        }),
      )
      setVocab(updated)
      setLoadingVocab(false)
    },
    [playable, references, vocab, localRecs],
  )

  async function startScenario() {
    setIndex(0)
    setOutcomes([])
    setCurrent(null)
    setCurrentAttempt(null)
    setStage('playing')
    await loadVocabForPlayable()
  }

  function nextTurn() {
    setCurrent(null)
    setCurrentAttempt(null)
    setRevealArmed(false)
    if (index + 1 >= playable.length) {
      setStage('summary')
    } else {
      setIndex(index + 1)
    }
  }

  // ==========================================================================
  // STAGE: HUB
  // ==========================================================================
  if (stage === 'hub') {
    return (
      <section className="aww-scenario-hub">
        <StorageNotice storageOk={storageOk} />
        <div className="aww-hub-header">
          <h1 className="aww-hub-title">Everyday chats</h1>
          <p className="aww-hub-subtitle">Try one sign at a time in an everyday chat.</p>
        </div>

        <div className="aww-scenario-grid">
          {SCENARIOS.map((s) => {
            const covered = s.turns.filter((t) => references.has(t.gloss)).length
            const isReady = covered === s.turns.length
            return (
              <button
                key={s.id}
                className={`aww-scenario-card theme-${s.id}`}
                onClick={() => {
                  setScenarioId(s.id)
                  setIndex(0)
                  setOutcomes([])
                  setCurrent(null)
                  setCurrentAttempt(null)
                  setVocab(new Map())
                  setStage('intro')
                }}
              >
                <div className="card-glass-layer">
                  <div className="card-top">
                    <span className={`card-status ${isReady ? '' : 'card-status-preview'}`}>
                      {isReady ? 'Ready to try' : `Preview: ${covered} of ${s.turns.length} signs available`}
                    </span>
                    <span className="card-status">
                      {isReady ? `${s.turns.length} Turns` : `${covered} Playable Turns`}
                    </span>
                  </div>
                  <div className="card-bottom">
                    <h3>{s.title}</h3>
                    <p>{s.subtitle}</p>
                    <div className="play-circle">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                        <path d="M5 3l14 9-14 9V3z" fill="currentColor" />
                      </svg>
                    </div>
                  </div>
                </div>
              </button>
            )
          })}

          <div className="aww-scenario-card theme-hospital disabled">
            <div className="card-glass-layer">
              <div className="card-top">
                <span className="card-status">Coming Soon</span>
                <span className="card-status">Healthcare</span>
              </div>
              <div className="card-bottom">
                <h3>Hospital Visit</h3>
                <p>Communicating symptoms, medication, and understanding doctor instructions.</p>
              </div>
            </div>
          </div>

          <div className="aww-scenario-card theme-bus disabled">
            <div className="card-glass-layer">
              <div className="card-top">
                <span className="card-status">Coming Soon</span>
                <span className="card-status">Transit</span>
              </div>
              <div className="card-bottom">
                <h3>Public Transit</h3>
                <p>Buying bus and train tickets, asking for route directions and stops.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    )
  }

  // ==========================================================================
  // STAGE: BEFORE YOU START (INTRO)
  // ==========================================================================
  if (stage === 'intro') {
    const isReady = playable.length === scenario.turns.length
    return (
      <section className="aww-mission-briefing">
        <StorageNotice storageOk={storageOk} />
        {/* Full-width styled Hero Card */}
        <div className={`briefing-hero-card theme-${scenario.id}`}>
          <div className="briefing-hero-overlay">
            <div className="briefing-nav-row">
              <button className="aww-back-btn" onClick={() => setStage('hub')}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Back to chats
              </button>
              <div className="briefing-pills">
                <span className="briefing-pill">BEFORE YOU START</span>
                <span className="briefing-pill">{isReady ? `${scenario.turns.length} TURNS` : `${playable.length} PLAYABLE TURNS`}</span>
                <span className={`briefing-pill ${isReady ? '' : 'briefing-pill-preview'}`}>
                  {isReady ? 'READY TO TRY' : `PREVIEW: ${playable.length} OF ${scenario.turns.length} SIGNS AVAILABLE`}
                </span>
              </div>
            </div>

            <div className="briefing-hero-body">
              <h1 ref={stageHeadingRef} tabIndex={-1}>{scenario.title}</h1>
              <p className="briefing-hero-sub">{scenario.subtitle}</p>
              <p className="briefing-hero-desc">{scenario.description}</p>
            </div>
          </div>
        </div>

        {/* Script Flow & Action Section */}
        <div className="briefing-main-grid">
          <div className="briefing-script-container">
            <div className="briefing-section-header">
              <h2>The signs you'll practise</h2>
              <span className="section-meta">{playable.length} of {scenario.turns.length} ready</span>
            </div>

            {loading ? (
              <p className="empty-state">Loading signs...</p>
            ) : (
              <>
                <div className="briefing-vocab">
                  {[...new Set(scenario.turns.map((t) => t.gloss))].map((g) => (
                    <span
                      key={g}
                      className={`briefing-vocab-chip ${references.has(g) ? '' : 'pending'}`}
                    >
                      {glossLabel(g)}
                    </span>
                  ))}
                </div>

                {/* The script is a spoiler for a "one sign at a time" roleplay —
                    reveal it only on request. */}
                <details className="briefing-script">
                  <summary>Preview the full script ({scenario.turns.length} turns)</summary>
                  <ol className="briefing-flow-list">
                    {scenario.turns.map((t, i) => {
                      const hasRef = references.has(t.gloss)
                      return (
                        <li key={t.id} className={`briefing-flow-item ${hasRef ? 'ready' : 'pending'}`}>
                          <div className="flow-num-col">
                            <span className="flow-step">Turn {i + 1}</span>
                            <span className={`flow-badge ${hasRef ? 'badge-ready' : 'badge-pending'}`}>
                              {hasRef ? 'Ready' : 'Pending'}
                            </span>
                          </div>

                          <div className="flow-content-col">
                            <p className="flow-partner-line">"{t.partnerLine}"</p>
                            <div className="flow-sign-row">
                              <span className="flow-sign-tag">Sign to produce:</span>
                              <strong className="flow-sign-gloss">{glossLabel(t.gloss)}</strong>
                            </div>
                            <p className="flow-prompt-text">{t.prompt}</p>
                          </div>
                        </li>
                      )
                    })}
                  </ol>
                </details>
              </>
            )}
          </div>

          {/* Action Sidebar / Card */}
          <aside className="briefing-action-card">
            <h3>Ready to begin?</h3>
            <p className="action-card-text">
              Read the chat. Then try each sign.
            </p>

            <div className="scenario-variant-selector">
              <span className="variant-label">Mode</span>
              <div className="variant-toggle-group" role="radiogroup" aria-label="Scenario practice mode">
                <button
                  type="button"
                  className={`variant-toggle-btn ${!recallMode ? 'active' : ''}`}
                  onClick={() => setRecallMode(false)}
                  role="radio"
                  aria-checked={!recallMode}
                >
                  Guided
                </button>
                <button
                  type="button"
                  className={`variant-toggle-btn ${recallMode ? 'active' : ''}`}
                  onClick={() => setRecallMode(true)}
                  role="radio"
                  aria-checked={recallMode}
                >
                  Recall
                </button>
              </div>
              <p className="variant-description">
                {recallMode
                  ? 'Try from memory. See the sign after your turn.'
                  : 'Watch the sign while you try.'}
              </p>
            </div>

            <div className="action-card-stats">
              <div className="card-stat-box">
                <span className="stat-number">{playable.length}</span>
                <span className="stat-label">Ready</span>
              </div>
              <div className="card-stat-box">
                <span className="stat-number" style={{ color: pending.length > 0 ? 'var(--danger)' : 'var(--text-dim)' }}>
                  {pending.length}
                </span>
                <span className="stat-label">Missing</span>
              </div>
            </div>

            <button
              className="btn massive"
              onClick={() => void startScenario()}
              disabled={playable.length === 0}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {playable.length === 0
                ? 'Signs are not ready yet'
                : isReady
                  ? 'Start Scenario'
                  : `Start Preview (${playable.length} turns)`}
            </button>

            {isAuthorMode && pending.length > 0 && (
              <p className="action-missing-note">
                Tip: Record the missing signs in the Record tab to unlock the full sequence.
              </p>
            )}
          </aside>
        </div>
      </section>
    )
  }

  // ==========================================================================
  // STAGE: SUMMARY
  // ==========================================================================
  if (stage === 'summary') {
    const total =
      outcomes.length > 0
        ? Math.round(outcomes.reduce((a, o) => a + o.score.rubric.total, 0) / outcomes.length)
        : 0
    const weakest = [...outcomes].sort((a, b) => a.score.rubric.total - b.score.rubric.total)[0]

    return (
      <section className="aww-scenario-hub">
        <StorageNotice storageOk={storageOk} />
        <div className={`briefing-hero-card theme-${scenario.id}`} style={{ marginBottom: '32px' }}>
          <div className="briefing-hero-overlay">
            <div className="briefing-nav-row">
              <button className="aww-back-btn" onClick={() => setStage('hub')}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Back to Hub
              </button>
              <span className="briefing-pill">{pending.length > 0 ? 'PREVIEW FINISHED' : 'CHAT FINISHED'}</span>
            </div>
            <div className="briefing-hero-body">
              <h1 ref={stageHeadingRef} tabIndex={-1}>{scenario.title}</h1>
              <p className="briefing-hero-sub">You completed {outcomes.length} of {playable.length} playable turns.</p>
            </div>
          </div>
        </div>

        <div className="briefing-main-grid">
          <div className="briefing-script-container">
            <div className="briefing-section-header">
              <h2>Your matches</h2>
            </div>
            <ul className="mastery-list" style={{ marginTop: '16px' }}>
              {outcomes.map((o) => (
                <li className="mastery-row" key={o.turn.id}>
                  <span className="rec-gloss">{glossLabel(o.turn.gloss)}</span>
                  <div className="mastery-bar">
                    <div style={{ width: `${o.score.rubric.total}%` }} />
                  </div>
                  <span className="mastery-pct">{o.score.rubric.total}</span>
                  <span className="mastery-meta">
                    {band(o.score.rubric.total).label}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <aside className="briefing-action-card">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
              <ScoreBadge score={total} hideDelta />
              {weakest && (
                <p style={{ marginTop: '16px', textAlign: 'center', fontSize: '0.95rem' }}>
                  Try this again: <strong>{glossLabel(weakest.turn.gloss)}</strong> ({weakest.score.rubric.total}/100)
                </p>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button className="btn massive" onClick={() => void startScenario()} style={{ width: '100%', justifyContent: 'center' }}>
                Run Again
              </button>
              <button
                className="btn ghost massive"
                onClick={() => setStage('hub')}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Back to Hub
              </button>
            </div>
          </aside>
        </div>
      </section>
    )
  }

  // ==========================================================================
  // STAGE: PLAYING (CINEMATIC 50/50 SPLIT-SCREEN)
  // ==========================================================================
  if (loadingVocab) {
    return (
      <div className="aww-practice-env">
        <StorageNotice storageOk={storageOk} />
        <div className="aww-pane-content">
          <p className="hint-text">Loading signs...</p>
        </div>
      </div>
    )
  }

  if (!turn || !reference) {
    return (
      <div className="aww-practice-env">
        <StorageNotice storageOk={storageOk} />
        <div className="aww-pane-content">
          <p className="hint-text">
            {!turn
              ? 'This turn could not be found.'
              : `"${glossLabel(turn.gloss)}" could not load.`}
          </p>
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'center' }}>
            <button className="btn" onClick={() => void loadVocabForPlayable()}>
              Try loading again
            </button>
            <button className="btn ghost" onClick={() => setStage('intro')}>
              Back to the chat
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="aww-practice-env aww-scenario-env" data-phase={capture.phase}>
      <StorageNotice storageOk={storageOk} />
      <span className="sr-only" aria-live="polite">{liveMessage}</span>

      {/* Teleprompter strip across the top — the prompt belongs over "you", not
          over the reference skeleton it used to float across. */}
      <div className="aww-scenario-topbar">
        <button className="aww-leave-btn" onClick={() => setStage('hub')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Leave
        </button>

        {!current && (
          <div className="aww-scenario-dialogue">
            <div className="dialogue-meta-row">
              <span className="dialogue-turn-tag">Turn {index + 1} of {playable.length}</span>
              <span className="dialogue-scenario-tag">{scenario.title}</span>
              {recallMode && <span className="dialogue-recall-pill">Recall Mode</span>}
            </div>
            {turn.partnerLine && (
              <p className="dialogue-partner-line">"{turn.partnerLine}"</p>
            )}
            <p className="dialogue-prompt-line">
              Sign: <strong>{glossLabel(turn.gloss)}</strong> &mdash; {turn.prompt}
            </p>
            {scenarioHint(turn, isAuthorMode) && (
              <span className="dialogue-hint-pill">
                <Lightbulb size={13} aria-hidden="true" />
                {turn.hint}
                {turn.pendingSignerValidation && isAuthorMode && (
                  <span className="hint-author-badge"> [Author: pending validation]</span>
                )}
              </span>
            )}
          </div>
        )}
      </div>

      {/* The 50/50 Split Screen */}
      <div className="aww-split-screen">
        {/* Left Pane: Target Reference */}
        <div className={`aww-pane aww-pane-left ${recallMode && !current ? 'scenario-recall-pane' : ''}`}>
          <div className="aww-pane-header">
            <p className="aww-pane-label">Watch</p>
            <h2 className="aww-pane-title">{glossLabel(turn.gloss)}</h2>
          </div>

          <div className="aww-pane-content">
            {recallMode && !current ? (
              <div className="aww-recall-hidden-card">
                <span className="aww-recall-badge">Recall Mode</span>
                <p className="aww-recall-lead">Sign from memory</p>
                <p className="aww-recall-sub">
                  Try the sign. Then watch it again.
                </p>
              </div>
            ) : (
              <SkeletonPlayer
                frames={reference.frames}
                videoWidth={reference.videoWidth}
                videoHeight={reference.videoHeight}
                colorOverride="#e6eeec"
              />
            )}
          </div>
        </div>

        {/* Right Pane: User Camera / Replay */}
        <div className="aww-pane aww-pane-right" data-camera-status={capture.tracking.status}>
          <div className="aww-pane-header">
            <p className="aww-pane-label">You</p>
          </div>

          {/* Live Camera */}
          <div className={`aww-camera-container ${current ? 'hidden' : ''}`}>
            <CameraStage
              videoRef={capture.tracking.videoRef}
              canvasRef={capture.tracking.canvasRef}
              status={capture.tracking.status}
              error={capture.tracking.error}
              onStart={() => void capture.tracking.start()}
              idleHint=""
              inferring={capture.tracking.inferring}
              intro={
                <div className="aww-camera-intro">
                  <p className="aww-camera-intro-lead">Your turn.</p>
                  <p className="aww-camera-intro-note">
                    Your camera stays on this device. No video is sent or
                    recorded.
                  </p>
                  <button className="btn massive" onClick={() => void capture.tracking.start()}>
                    Turn on camera
                  </button>
                </div>
              }
            />
          </div>

          {/* Camera controls, anchored to this pane. One action at a time. */}
          {!current && capture.tracking.status === 'running' && (
            <>
              {capture.phase === 'countdown' && (
                <div className="aww-cam-countdown" aria-hidden="true">{capture.count}</div>
              )}
              {capture.phase === 'recording' && (
                <div className="aww-cam-rec">
                  <span className="aww-rec-dot" aria-hidden="true" />
                  REC {(capture.elapsedMs / 1000).toFixed(1)}s
                </div>
              )}
              <div className="aww-cam-action">
                {capture.phase === 'countdown' ? (
                  <button className="aww-cam-btn aww-cam-btn-ghost" onClick={capture.cancel}>
                    <X size={16} aria-hidden="true" />
                    Cancel
                  </button>
                ) : capture.phase === 'recording' ? (
                  <button className="aww-cam-btn aww-cam-btn-stop" onClick={capture.finish}>
                    <Square size={13} fill="currentColor" strokeWidth={0} aria-hidden="true" />
                    Stop &amp; Score
                  </button>
                ) : (
                  <button className="aww-cam-btn" onClick={() => capture.begin(captureMs)}>
                    <Circle size={15} fill="currentColor" strokeWidth={0} aria-hidden="true" />
                    Record attempt
                  </button>
                )}
              </div>
            </>
          )}

          {/* Replay Overlay on Scored Turn */}
          {current && currentAttempt && (
            <div className="aww-replay-container">
              <SkeletonPlayer
                frames={currentAttempt.frames}
                videoWidth={currentAttempt.videoWidth || reference.videoWidth}
                videoHeight={currentAttempt.videoHeight || reference.videoHeight}
              />
            </div>
          )}
        </div>
      </div>

      {/* Centre result — one panel, capture-failure kept separate from a score. */}
      {current && (() => {
        const noHands =
          current.detail.hands.length > 0 && current.detail.hands.every((h) => h.missing)
        const retry = () => {
          setCurrent(null)
          setCurrentAttempt(null)
          setRevealArmed(false)
          capture.begin(captureMs)
        }
        const nextLabel = index + 1 >= playable.length ? 'See summary' : 'Next turn'
        return (
          <div className="aww-result-overlay" data-reveal={revealArmed ? 'on' : undefined}>
            {noHands ? (
              <div className="aww-result-panel aww-result-nohands">
                <p className="pane-label">Couldn't see your hands</p>
                <p className="aww-result-lead">The tracker didn't pick up a hand in that take.</p>
                <p>Move back so your hands and shoulders are in frame, and make sure the room is well lit.</p>
                <div className="aww-result-actions">
                  <button className="btn massive" onClick={retry}>Try again</button>
                  <button className="btn ghost massive" onClick={nextTurn}>Skip this turn</button>
                </div>
              </div>
            ) : (
              <div className="aww-result-panel">
                <ScoreBadge score={current.rubric.total} hideDelta />
                <div className="aww-result-feedback">
                  {current.rubric.total === 100 ? (
                    <p className="perfect-hint">Great match!</p>
                  ) : (
                    <>
                      {current.detail.hints.map((h, i) => (
                        <p key={i}>{h}</p>
                      ))}
                    </>
                  )}
                  <div className="aww-result-actions">
                    <button className="btn massive" onClick={retry}>Try again</button>
                    <button className="btn ghost massive" onClick={nextTurn}>
                      {nextLabel}
                      {nextLabel === 'Next turn' && <ArrowRight size={16} aria-hidden="true" />}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })()}
    </div>
  )
}
