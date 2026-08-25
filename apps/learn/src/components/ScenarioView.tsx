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
import { RUBRIC_BASIS, RUBRIC_LABEL, scoreTurn } from '../scenario/rubric'
import type { RubricComponent, TurnScore } from '../scenario/rubric'
import type { Scenario, ScenarioTurn } from '../scenario/types'
import { SCENARIOS } from '../data/scenarios'
import { glossLabel, translationOf } from '../data/translations'
import { CameraStage } from './CameraStage'
import { SkeletonPlayer } from './SkeletonPlayer'
import { ScoreBadge } from './ScoreBadge'
import { STACKED_LAYOUT, useMediaQuery } from './useMediaQuery'

type Stage = 'intro' | 'playing' | 'summary'

interface TurnOutcome {
  turn: ScenarioTurn
  score: TurnScore
  attempt: SignRecording
}

const RUBRIC_ORDER: RubricComponent[] = ['accuracy', 'appropriateness', 'fluency']

function RubricBars({ score }: { score: TurnScore }) {
  return (
    <ul className="rubric-list">
      {RUBRIC_ORDER.map((key) => {
        const value = score.rubric[key]
        return (
          <li key={key} title={RUBRIC_BASIS[key]}>
            <span className="rubric-name">{RUBRIC_LABEL[key]}</span>
            <div className="rubric-bar">
              <div style={{ width: `${value ?? 0}%` }} className={value === null ? 'na' : ''} />
            </div>
            <span className="rubric-value">{value === null ? 'n/a' : value}</span>
          </li>
        )
      })}
    </ul>
  )
}

/**
 * Runs a scripted conversation scenario: each turn asks for one sign, scores it
 * through the existing DTW path, and reports against the proposal's rubric.
 * Turns whose gloss has no reference recording yet are skipped rather than
 * blocking the scenario.
 */
export function ScenarioView() {
  const [scenarioId, setScenarioId] = useState(SCENARIOS[0].id)
  const scenario: Scenario = SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[0]

  // Metadata drives the intro list and decides which turns are playable.
  const [references, setReferences] = useState<Map<string, RecordingMeta>>(new Map())
  const [localRecs, setLocalRecs] = useState<SignRecording[]>([])
  // Frames for this scenario's vocabulary, fetched once when it starts. The
  // whole vocabulary is needed, not just the current turn: the rubric's
  // appropriateness component scores the attempt against every competing sign.
  const [vocab, setVocab] = useState<Map<string, SignRecording>>(new Map())
  const [loadingVocab, setLoadingVocab] = useState(false)
  const [loading, setLoading] = useState(true)
  const [stage, setStage] = useState<Stage>('intro')
  const [index, setIndex] = useState(0)
  const [outcomes, setOutcomes] = useState<TurnOutcome[]>([])
  const [current, setCurrent] = useState<TurnScore | null>(null)

  useEffect(() => {
    void (async () => {
      const [local, index] = await Promise.all([listRecordings(), loadReferenceIndex()])
      setLocalRecs(local)
      setReferences(pickReferences([...local.map(toMeta), ...index]))
      setLoading(false)
    })()
  }, [])

  // Only turns we have a reference for can be scored; the rest stay visible as
  // "reference pending" so the gap is obvious rather than silently dropped.
  const playable = useMemo(
    () => scenario.turns.filter((t) => references.has(t.gloss)),
    [scenario.turns, references],
  )
  const pending = scenario.turns.filter((t) => !references.has(t.gloss))

  const turn: ScenarioTurn | undefined = playable[index]
  const reference = turn ? vocab.get(turn.gloss) : undefined
  const captureMs = reference ? Math.max(reference.durationMs + 1500, 2500) : 3500

  // Appropriateness is judged against this scenario's own vocabulary — the
  // signs the learner could plausibly have confused this turn with — not the
  // whole library. See scoreTurn for why.
  const scenarioVocabulary = useMemo(() => [...vocab.values()], [vocab])

  // See PracticeView / useFeedbackLatency: the score commits in its final form
  // on the measured frame, and only then is the reveal released.
  const [revealArmed, setRevealArmed] = useState(false)
  const latency = useFeedbackLatency('scenario', () => setRevealArmed(true))

  // See PracticeView: the reference replay moves into the camera stage when the
  // layout stacks, so a phone shows the sign and the signer together.
  const stacked = useMediaQuery(STACKED_LAYOUT)

  // A stage change swaps the whole panel, which drops keyboard focus to the
  // document root. Move it to the new view's heading instead.
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
      setRevealArmed(false)
      setCurrent(score)
      setOutcomes((prev) => [...prev.filter((o) => o.turn.id !== turn.id), { turn, score, attempt }])

      // Worth measuring separately from Practice: a scenario turn also runs the
      // rubric's appropriateness pass, one extra DTW alignment per competing
      // sign in the scenario vocabulary.
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
        // Unmeasurable take — release the reveal anyway.
        requestAnimationFrame(() => setRevealArmed(true))
      }

      // Log the DTW accuracy — not the rubric total — so "mastery" means the
      // same thing whether a sign was practised here or in the Practice tab.
      addAttempt({
        id: attempt.id,
        gloss: turn.gloss,
        referenceId: reference.id,
        score: score.detail.score,
        worstFingers: topFingers(score.detail),
        createdAt: attempt.createdAt,
      }).catch((e: unknown) => console.error('Failed to log scenario attempt', e))
    },
    [turn, reference, scenarioVocabulary, latency],
  )

  const capture = useSignCapture(handleCaptured)

  // Spoken counterpart to the capture badge and the score ring, neither of
  // which exists for a screen reader. See PracticeView for the same pattern.
  const liveMessage = useMemo(() => {
    if (capture.phase === 'countdown') return 'Get ready. Recording starts in 3 seconds.'
    if (capture.phase === 'recording') return 'Recording. Sign now.'
    if (current) {
      const wrong =
        current.bestMatchGloss !== turn?.gloss
          ? ` That looked closer to ${current.bestMatchGloss}.`
          : ''
      return `Scored ${current.rubric.total} out of 100.${wrong}`
    }
    return ''
  }, [capture.phase, current, turn])
  const stopTracking = capture.tracking.stop

  // The camera stage only exists while playing, so leaving a turn would strand
  // a live MediaStream (camera light on) and a frame loop that cannot restart
  // when the video element remounts. Release it whenever we leave the turn view.
  useEffect(() => {
    if (stage !== 'playing') stopTracking()
  }, [stage, stopTracking])

  // Same as Practice: a turn's score is on screen, nothing is consuming frames.
  const { pause: pauseTracking, resume: resumeTracking } = capture.tracking
  useEffect(() => {
    if (current) pauseTracking()
    else resumeTracking()
  }, [current, pauseTracking, resumeTracking])

  async function startScenario() {
    setIndex(0)
    setOutcomes([])
    setCurrent(null)
    setStage('playing')
    // Fetch the frames for every playable turn up front. It is a handful of
    // signs, and doing it here means no turn stalls mid-conversation.
    if (vocab.size > 0) return
    setLoadingVocab(true)
    const metas = playable
      .map((t) => references.get(t.gloss))
      .filter((m): m is RecordingMeta => m !== undefined)
    const loaded = new Map<string, SignRecording>()
    await Promise.all(
      metas.map(async (m) => {
        const full = m.file
          ? await loadReferenceFrames(m.file)
          : (localRecs.find((r) => r.id === m.id) ?? null)
        if (full) loaded.set(m.gloss, full)
      }),
    )
    setVocab(loaded)
    setLoadingVocab(false)
  }

  function nextTurn() {
    setCurrent(null)
    setRevealArmed(false)
    if (index + 1 >= playable.length) {
      setStage('summary')
    } else {
      setIndex(index + 1)
    }
  }

  // ---- intro ----------------------------------------------------------------
  if (stage === 'intro') {
    return (
      <section className="library-card">
        <div className="library-head">
          <h2 ref={stageHeadingRef} tabIndex={-1}>
            {scenario.title}
          </h2>
          <span className="library-count">{scenario.subtitle}</span>
        </div>

        {SCENARIOS.length > 1 && (
          <div className="gloss-chips">
            {SCENARIOS.map((s) => {
              const covered = s.turns.filter((t) => references.has(t.gloss)).length
              return (
                <button
                  key={s.id}
                  className={s.id === scenario.id ? 'chip active' : 'chip'}
                  onClick={() => {
                    // Results belong to the scenario they came from — and so
                    // does the loaded vocabulary, which sets the bar that
                    // appropriateness is judged against.
                    setScenarioId(s.id)
                    setIndex(0)
                    setOutcomes([])
                    setCurrent(null)
                    setVocab(new Map())
                  }}
                  title={`${covered} of ${s.turns.length} turns have a reference`}
                >
                  {s.title} {covered}/{s.turns.length}
                </button>
              )
            })}
          </div>
        )}

        <p className="hint-text">{scenario.description}</p>

        {loading ? (
          <p className="empty-state">Loading references…</p>
        ) : (
          <>
            <ol className="turn-preview">
              {scenario.turns.map((t) => (
                <li key={t.id} className={references.has(t.gloss) ? '' : 'pending'}>
                  <span className="rec-gloss" title={translationOf(t.gloss)}>
                    {glossLabel(t.gloss)}
                  </span>
                  <span className="turn-prompt">{t.prompt}</span>
                  {!references.has(t.gloss) && <em className="badge">reference pending</em>}
                </li>
              ))}
            </ol>

            <p className="hint-text">
              {playable.length} of {scenario.turns.length} turns have a reference recording.
              {pending.length > 0 && (
                <>
                  {' '}
                  Missing: <strong>{pending.map((t) => t.gloss).join(', ')}</strong> — record them
                  in the Record tab and they join the scenario automatically.
                </>
              )}
            </p>

            <div className="row-buttons">
              <button
                className="btn"
                onClick={() => void startScenario()}
                disabled={playable.length === 0}
              >
                {playable.length === 0 ? 'No references yet' : 'Start scenario'}
              </button>
            </div>
          </>
        )}

        <p className="draft-note">{scenario._draftNote}</p>
      </section>
    )
  }

  // ---- summary --------------------------------------------------------------
  if (stage === 'summary') {
    const total =
      outcomes.length > 0
        ? Math.round(outcomes.reduce((a, o) => a + o.score.rubric.total, 0) / outcomes.length)
        : 0
    const weakest = [...outcomes].sort((a, b) => a.score.rubric.total - b.score.rubric.total)[0]
    const anyUnmeasured = outcomes.some((o) => o.score.rubric.unmeasured.length > 0)

    return (
      <section className="library-card">
        <div className="library-head">
          <h2 ref={stageHeadingRef} tabIndex={-1}>
            Scenario complete
          </h2>
          <span className="library-count">{scenario.title}</span>
        </div>

        <div className="result-top">
          <ScoreBadge score={total} />
          <div>
            <p style={{ margin: 0 }}>
              You completed {outcomes.length} of {scenario.turns.length} turns.
            </p>
            {weakest && (
              <p style={{ margin: '6px 0 0' }}>
                Weakest sign: <strong>{weakest.turn.gloss}</strong> ({weakest.score.rubric.total})
              </p>
            )}
          </div>
        </div>

        <ul className="mastery-list">
          {outcomes.map((o) => (
            <li className="mastery-row" key={o.turn.id}>
              <span className="rec-gloss">{o.turn.gloss}</span>
              <div className="mastery-bar">
                <div style={{ width: `${o.score.rubric.total}%` }} />
              </div>
              <span className="mastery-pct">{o.score.rubric.total}</span>
              <span className="mastery-meta">
                {o.score.bestMatchGloss !== o.turn.gloss
                  ? `closest match: ${o.score.bestMatchGloss}`
                  : 'correct sign'}
              </span>
            </li>
          ))}
        </ul>

        <div className="rubric-note">
          <p className="rubric-note-head">
            <strong>How this is scored</strong>
          </p>
          <dl className="rubric-defs">
            <dt>Accuracy — 50%</dt>
            <dd>
              How closely your hand movement matches the reference recording of this sign,
              compared frame by frame with time warping.
            </dd>
            <dt>Appropriateness — 30%</dt>
            <dd>
              Whether you produced the sign that was asked for rather than a different one. Your
              attempt is also scored against every other sign in the library; if another sign
              matches better, this drops. It can only spot confusion with signs we hold
              references for.
            </dd>
            <dt>Fluency &amp; timing — 20%</dt>
            <dd>
              How close your pace was to the reference. Judged separately because the accuracy
              measure deliberately ignores speed, so signing slowly is not penalised twice.
            </dd>
          </dl>
          <p className="rubric-note-foot">
            <strong>Not scored: non-manual markers.</strong> The proposal allots 10% to facial
            expression and head/body movement. This build tracks hand landmarks only, so that
            signal is not captured and no score for it would be honest. Its 10% is reallocated
            to accuracy — hence 50 / 30 / 20 rather than the proposal's 40 / 30 / 20 / 10.
            Scoring it needs face and pose tracking, and is future work.
            {anyUnmeasured && (
              <>
                {' '}
                Components shown as &ldquo;n/a&rdquo; had no data for that turn; their weight was
                shared across the rest rather than counted as zero.
              </>
            )}
          </p>
        </div>

        <div className="row-buttons">
          <button className="btn" onClick={() => void startScenario()}>
            Run it again
          </button>
          <button className="btn btn-ghost" onClick={() => setStage('intro')}>
            Back to overview
          </button>
        </div>
      </section>
    )
  }

  // ---- playing --------------------------------------------------------------
  if (loadingVocab) {
    return (
      <section className="library-card">
        <p className="empty-state">Loading the signs for this conversation…</p>
      </section>
    )
  }

  if (!turn || !reference) {
    return (
      <section className="library-card">
        <p className="empty-state">This turn has no reference recording.</p>
        <div className="row-buttons">
          <button className="btn" onClick={() => setStage('intro')}>
            Back to overview
          </button>
        </div>
      </section>
    )
  }

  return (
    <div className="record-layout" data-phase={capture.phase}>
      <section className="camera-card">
        <CameraStage
          videoRef={capture.tracking.videoRef}
          canvasRef={capture.tracking.canvasRef}
          status={capture.tracking.status}
          error={capture.tracking.error}
          onStart={() => void capture.tracking.start()}
          idleHint="Start the camera to take part in the conversation."
          inferring={capture.tracking.inferring}
          pip={
            stacked && !current ? (
              <SkeletonPlayer
                frames={reference.frames}
                videoWidth={reference.videoWidth}
                videoHeight={reference.videoHeight}
              />
            ) : undefined
          }
        >
          {capture.phase === 'countdown' && (
            <div className="countdown-overlay">
              <span key={capture.count}>{capture.count}</span>
            </div>
          )}
          {capture.phase === 'recording' && (
            <>
              <div className="rec-badge">● REC {(capture.elapsedMs / 1000).toFixed(1)} s</div>
              <div className="rec-progress">
                <div style={{ transform: `scaleX(${Math.min(capture.elapsedMs / captureMs, 1)})` }} />
              </div>
            </>
          )}
        </CameraStage>
        <div className="camera-bar">
          <span className="camera-stats">
            Turn {index + 1} of {playable.length}
          </span>
          {capture.tracking.stats && (
            <span className="camera-stats">
              {capture.tracking.stats.fps.toFixed(0)} fps ·{' '}
              {capture.tracking.stats.inferenceMs.toFixed(1)} ms
            </span>
          )}
        </div>
      </section>

      <aside className="record-panel" data-reveal={revealArmed ? 'on' : undefined}>
        {/* Decorative: "Turn N of M" below states the same thing in text. */}
        <div className="turn-progress" aria-hidden="true">
          {playable.map((t, i) => (
            <span key={t.id} className={i < index ? 'done' : i === index ? 'active' : ''} />
          ))}
        </div>

        <p className="sr-only" role="status">
          {liveMessage}
        </p>

        <p className="partner-line">{turn.partnerLine}</p>
        <h2 ref={stageHeadingRef} tabIndex={-1}>
          Sign: {glossLabel(turn.gloss)}
        </h2>
        <p className="hint-text">{turn.prompt}</p>

        {current ? (
          <>
            <div className="result-top">
              <ScoreBadge score={current.rubric.total} />
              <ul className="hint-list">
                {current.bestMatchGloss !== turn.gloss && (
                  <li>
                    That looked closer to <strong>{current.bestMatchGloss}</strong> than to{' '}
                    {turn.gloss}.
                  </li>
                )}
                {current.detail.hints.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            </div>
            <RubricBars score={current} />
            <div className="row-buttons">
              <button className="btn" onClick={nextTurn}>
                {index + 1 >= playable.length ? 'See summary' : 'Next turn'}
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setCurrent(null)
                  setRevealArmed(false)
                  capture.begin(captureMs)
                }}
                disabled={capture.tracking.status !== 'running'}
              >
                Try again
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="reference-preview">
              <p className="compare-label">Reference</p>
              {reference.provisional && (
                <p className="provisional-note">
                  Provisional reference — a team stand-in, not verified SSL.
                </p>
              )}
              {/* Stacked, the player is in the camera stage; the label and the
                  provisional note stay here at every width. */}
              {!stacked && (
                <SkeletonPlayer
                  frames={reference.frames}
                  videoWidth={reference.videoWidth}
                  videoHeight={reference.videoHeight}
                />
              )}
            </div>
            {turn.hint && <p className="hint-text">💡 {turn.hint}</p>}
            <div className="panel-actions">
              {capture.phase === 'countdown' ? (
                <button className="btn btn-ghost" onClick={capture.cancel}>
                  Cancel
                </button>
              ) : capture.phase === 'recording' ? (
                <button className="btn" onClick={capture.finish}>
                  Stop &amp; score
                </button>
              ) : (
                <button
                  className="btn"
                  onClick={() => capture.begin(captureMs)}
                  disabled={capture.tracking.status !== 'running'}
                  title={
                    capture.tracking.status !== 'running' ? 'Start the camera first' : undefined
                  }
                >
                  Sign it
                </button>
              )}
            </div>
          </>
        )}

        <button className="btn btn-ghost" onClick={() => setStage('intro')}>
          Leave scenario
        </button>
      </aside>
    </div>
  )
}
