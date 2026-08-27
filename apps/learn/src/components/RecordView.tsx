import { useEffect, useMemo, useRef, useState } from 'react'
import { useHandTracking } from '../vision/useHandTracking'
import { handCoverage } from '../vision/types'
import type { HandFrame, RecordingMeta, SignRecording } from '../vision/types'
import { toMeta } from '../vision/types'
import { listRecordings, saveRecording } from '../storage/recordingStore'
import { loadReferenceFrames, loadReferenceIndex } from '../storage/bundledReferences'
import { pickReferenceList } from '../storage/references'
import { categoriesIn, categoryOf } from '../data/categories'
import { glossLabel, translationOf, matchesSearch } from '../data/translations'
import { CameraStage } from './CameraStage'
import { SkeletonPlayer } from './SkeletonPlayer'

const COUNTDOWN_S = 3
const MAX_MS = 8000
const SIGNER_KEY = 'ssl-learn-signer'

type Phase = 'idle' | 'countdown' | 'recording' | 'review'

/**
 * Reference Motion Capture Studio:
 * Select from 490+ signs or create a custom gloss.
 * Compare against existing benchmarks in real-time, capture precision landmark data,
 * review quality coverage, and save team provisional recordings directly into the library.
 */
export function RecordView() {
  const [phase, setPhaseState] = useState<Phase>('idle')
  const phaseRef = useRef<Phase>('idle')
  const setPhase = (p: Phase) => {
    phaseRef.current = p
    setPhaseState(p)
  }

  const [references, setReferences] = useState<RecordingMeta[]>([])
  const [localRecs, setLocalRecs] = useState<SignRecording[]>([])
  const [selected, setSelected] = useState<RecordingMeta | null>(null)
  const [reference, setReference] = useState<SignRecording | null>(null)
  const [refFailed, setRefFailed] = useState(false)

  const [isCustomMode, setIsCustomMode] = useState(false)
  const [customGloss, setCustomGloss] = useState('')
  const [signer, setSigner] = useState(() => localStorage.getItem(SIGNER_KEY) ?? 'Dev Team')

  const [count, setCount] = useState(COUNTDOWN_S)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [review, setReview] = useState<SignRecording | null>(null)
  const [justSaved, setJustSaved] = useState(false)
  const [saveError, setSaveError] = useState('')

  // Sign Picker State
  const [pickerOpen, setPickerOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string | null>(null)

  const framesRef = useRef<HandFrame[]>([])
  const startTsRef = useRef<number | null>(null)
  const countdownRef = useRef(0)
  const savedFlashRef = useRef(0)

  // Active gloss string
  const activeGloss = isCustomMode ? customGloss.trim().toUpperCase() : (selected?.gloss ?? '')
  const activeGlossRef = useRef(activeGloss)
  activeGlossRef.current = activeGloss

  const signerRef = useRef(signer)
  signerRef.current = signer

  // Load all references and local recordings
  useEffect(() => {
    void (async () => {
      const [loc, index] = await Promise.all([listRecordings(), loadReferenceIndex()])
      setLocalRecs(loc)
      const all = pickReferenceList([...loc.map(toMeta), ...index])
      setReferences(all)
      if (all.length > 0 && !selected && !isCustomMode) {
        setSelected(all[0])
      }
    })()
  }, [])

  // Load frames for the selected sign
  useEffect(() => {
    if (isCustomMode || !selected) {
      setReference(null)
      setRefFailed(false)
      return
    }
    let cancelled = false
    setReference(null)
    setRefFailed(false)
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
  }, [selected, localRecs, isCustomMode])

  const captureMs = reference ? Math.min(Math.max(reference.durationMs + 2000, 3500), MAX_MS) : MAX_MS

  const tracking = useHandTracking((frame) => {
    if (phaseRef.current !== 'recording') return
    if (startTsRef.current === null) startTsRef.current = frame.timestampMs
    const rel = frame.timestampMs - startTsRef.current
    framesRef.current.push({ ...frame, timestampMs: rel })
    setElapsedMs(rel)
    if (rel >= captureMs) finishRecording()
  })

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

  const { pause: pauseTracking, resume: resumeTracking } = tracking
  useEffect(() => {
    if (phase === 'review') pauseTracking()
    else resumeTracking()
  }, [phase, pauseTracking, resumeTracking])

  function beginCountdown() {
    if (tracking.status !== 'running' || !activeGloss.trim() || !signer.trim()) return
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
      gloss: activeGlossRef.current.trim().toUpperCase(),
      signer: signerRef.current.trim() || 'team',
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
      const loc = await listRecordings()
      setLocalRecs(loc)
      const all = pickReferenceList([...loc.map(toMeta), ...references])
      setReferences(all)
      const matched = all.find((r) => r.gloss === review.gloss)
      if (matched) {
        setSelected(matched)
        setIsCustomMode(false)
      }
    } catch (e) {
      console.error('Failed to save recording', e)
      setSaveError('Could not save to library. Try again.')
      return
    }
    setSaveError('')
    localStorage.setItem(SIGNER_KEY, signerRef.current)
    setReview(null)
    setPhase('idle')
    setJustSaved(true)
    savedFlashRef.current = window.setTimeout(() => setJustSaved(false), 3000)
  }

  // Categories & Filtering
  const categories = useMemo(() => categoriesIn(references), [references])
  const visible = useMemo(() => {
    const needle = query.trim()
    return references.filter(
      (r) =>
        (category === null || categoryOf(r) === category) &&
        matchesSearch(r.gloss, needle),
    )
  }, [references, query, category])

  const coverage = review ? handCoverage(review.frames) : 0

  return (
    <div className="aww-practice-env aww-studio-env" data-phase={phase} data-picker-open={pickerOpen}>
      {/* Studio Header Toolbar */}
      <div className="aww-studio-toolbar">
        <div className="studio-tool-left">
          <span className="studio-badge">MOCAP STUDIO</span>
          <button
            className="btn ghost studio-sign-btn"
            onClick={() => setPickerOpen(true)}
          >
            <span className="studio-sign-label">Active Sign:</span>
            <strong>{activeGloss ? glossLabel(activeGloss) : 'Select a Sign...'}</strong>
            {translationOf(activeGloss) && (
              <span className="studio-sign-sub">({translationOf(activeGloss)})</span>
            )}
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          <button
            className={`btn ghost ${isCustomMode ? 'active' : ''}`}
            onClick={() => {
              setIsCustomMode(true)
              setSelected(null)
            }}
          >
            + Custom Sign
          </button>
        </div>

        <div className="studio-tool-right">
          <div className="studio-signer-input-wrap">
            <span className="signer-label">Signer:</span>
            <input
              type="text"
              className="studio-signer-input"
              value={signer}
              onChange={(e) => setSigner(e.target.value)}
              placeholder="Performer name..."
              disabled={phase === 'countdown' || phase === 'recording'}
            />
          </div>
          {justSaved && <span className="studio-saved-pill">✓ Saved Take</span>}
        </div>
      </div>

      {/* The 50/50 Dual Studio View */}
      <div className="aww-split-screen">
        {/* Left Pane: Target Reference Benchmark */}
        <div className="aww-pane aww-pane-left">
          <div className="aww-pane-header">
            <p className="aww-pane-label">Benchmark Reference</p>
            <h2 className="aww-pane-title">
              {isCustomMode ? (
                <span style={{ fontStyle: 'italic' }}>New Vocabulary</span>
              ) : selected ? (
                glossLabel(selected.gloss)
              ) : (
                'Choose a sign'
              )}
            </h2>
            {selected && (
              <div className="studio-ref-meta">
                <span className="studio-ref-pill">
                  {selected.source === 'team-recording' ? 'Team Provisional' : 'Dataset Reference'}
                </span>
                <span className="studio-ref-pill">{(selected.durationMs / 1000).toFixed(1)}s</span>
              </div>
            )}
          </div>

          <div className="aww-pane-content">
            {isCustomMode ? (
              <div className="studio-custom-prompt">
                <p className="studio-prompt-title">Creating a New Reference</p>
                <p className="studio-prompt-desc">
                  Enter a unique gloss name below. Once recorded and saved, this sign will immediately become part of your local reference library.
                </p>
                <input
                  type="text"
                  className="studio-custom-input"
                  value={customGloss}
                  onChange={(e) => setCustomGloss(e.target.value.toUpperCase())}
                  placeholder="e.g. MORNING, WATER, TEACHER"
                  autoFocus
                  disabled={phase === 'countdown' || phase === 'recording'}
                />
              </div>
            ) : selected && reference ? (
              <SkeletonPlayer
                frames={reference.frames}
                videoWidth={reference.videoWidth}
                videoHeight={reference.videoHeight}
              />
            ) : selected && refFailed ? (
              <p className="camera-error">Could not load benchmark reference.</p>
            ) : !selected ? (
              <p className="hint-text">Choose a sign to benchmark against.</p>
            ) : (
              <p className="hint-text">Loading benchmark frames...</p>
            )}
          </div>
        </div>

        {/* Right Pane: Live Capture Stage / Review Replay */}
        <div className="aww-pane aww-pane-right">
          <div className="aww-pane-header">
            <p className="aww-pane-label">{phase === 'review' ? 'Take Review' : 'Live Motion Capture'}</p>
            {tracking.stats && phase !== 'review' && (
              <div className="studio-telemetry-row">
                <span className="telemetry-pill">{tracking.stats.fps.toFixed(0)} FPS</span>
                <span className="telemetry-pill">{tracking.stats.inferenceMs.toFixed(1)} ms</span>
                <span className="telemetry-pill">{tracking.stats.width}×{tracking.stats.height}</span>
              </div>
            )}
          </div>

          {/* Live Camera View */}
          <div className={`aww-camera-container ${phase === 'review' ? 'hidden' : ''}`}>
            <CameraStage
              videoRef={tracking.videoRef}
              canvasRef={tracking.canvasRef}
              status={tracking.status}
              error={tracking.error}
              onStart={() => void tracking.start()}
              idleHint="Turn on camera to begin recording reference data"
              inferring={tracking.inferring}
            />
          </div>

          {/* Review Replay */}
          {phase === 'review' && review && (
            <div className="aww-replay-container">
              <SkeletonPlayer
                frames={review.frames}
                videoWidth={review.videoWidth}
                videoHeight={review.videoHeight}
              />
            </div>
          )}
        </div>
      </div>

      {/* Bottom HUD Controls */}
      {phase !== 'review' ? (
        <div className="aww-hud">
          {tracking.status !== 'running' ? (
            <div className="aww-hud-idle">
              <button className="btn massive ghost" onClick={() => void tracking.start()}>
                Turn on Camera
              </button>
              <p>Motion capture tracks 21 hand landmarks frame-by-frame.</p>
            </div>
          ) : phase === 'idle' ? (
            <button
              className="btn massive"
              onClick={beginCountdown}
              disabled={!activeGloss.trim() || !signer.trim()}
            >
              {!activeGloss.trim()
                ? 'Select or Enter a Sign First'
                : !signer.trim()
                  ? 'Enter Signer Name First'
                  : `Record Take: ${activeGloss}`}
            </button>
          ) : phase === 'countdown' ? (
            <div className="aww-hud-countdown">
              <span>{count}</span>
              <button className="btn ghost massive" onClick={cancelCountdown}>Cancel</button>
            </div>
          ) : phase === 'recording' ? (
            <div className="aww-hud-recording">
              <div className="rec-badge">● REC {(elapsedMs / 1000).toFixed(1)} s</div>
              <button
                className="btn massive"
                style={{ background: 'var(--p-coral-500)' }}
                onClick={finishRecording}
              >
                Stop & Review
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        /* Review Take Overlay Bar */
        review && (
          <div className="aww-studio-review-bar">
            <div className="review-metrics">
              <div className="metric-box">
                <span className="metric-val">{(review.durationMs / 1000).toFixed(1)}s</span>
                <span className="metric-lbl">Duration</span>
              </div>
              <div className="metric-box">
                <span className="metric-val">{review.frames.length}</span>
                <span className="metric-lbl">Frames</span>
              </div>
              <div className="metric-box">
                <span className="metric-val">~{review.fps}</span>
                <span className="metric-lbl">FPS</span>
              </div>
              <div className="metric-box">
                <span className="metric-val" style={{ color: coverage >= 0.8 ? 'var(--accent)' : 'var(--danger)' }}>
                  {(coverage * 100).toFixed(0)}%
                </span>
                <span className="metric-lbl">Hand Tracking</span>
              </div>
            </div>

            {saveError && <p className="camera-error" style={{ margin: 0 }}>{saveError}</p>}

            <div className="review-actions">
              <button className="btn massive" onClick={() => void save()}>
                Save to Library ✓
              </button>
              <button className="btn ghost massive" onClick={beginCountdown}>
                Re-record
              </button>
              <button
                className="btn ghost massive"
                onClick={() => {
                  setReview(null)
                  setPhase('idle')
                }}
              >
                Discard Take
              </button>
            </div>
          </div>
        )
      )}

      {/* Command Palette Sign Search Modal */}
      <div className={`aww-picker-modal ${pickerOpen ? 'open' : ''}`}>
        <div className="aww-picker-backdrop" onClick={() => setPickerOpen(false)} />
        <div className="aww-picker-content">
          <div className="picker-head">
            <h2>Select Studio Reference Sign</h2>
            <button className="btn btn-ghost" onClick={() => setPickerOpen(false)}>Close</button>
          </div>

          <input
            type="search"
            className="picker-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${references.length} vocabulary signs...`}
            autoFocus
          />

          {categories.length > 1 && (
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
                  {name} ({references.filter((r) => categoryOf(r) === name).length})
                </button>
              ))}
            </div>
          )}

          {visible.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center' }}>
              <p className="hint-text">No existing sign matches "{query}".</p>
              {query.trim() && (
                <button
                  className="btn"
                  style={{ marginTop: '12px' }}
                  onClick={() => {
                    setIsCustomMode(true)
                    setCustomGloss(query.trim().toUpperCase())
                    setSelected(null)
                    setPickerOpen(false)
                  }}
                >
                  + Create custom sign "{query.trim().toUpperCase()}"
                </button>
              )}
            </div>
          ) : (
            <ul className="sign-list">
              {visible.slice(0, 80).map((r) => (
                <li key={r.id}>
                  <button
                    className={selected?.id === r.id && !isCustomMode ? 'sign-row active' : 'sign-row'}
                    onClick={() => {
                      setSelected(r)
                      setIsCustomMode(false)
                      setPickerOpen(false)
                    }}
                  >
                    <span className="sign-row-name">
                      {glossLabel(r.gloss)}
                      {translationOf(r.gloss) && (
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginLeft: '8px', fontStyle: 'italic' }}>
                          ({translationOf(r.gloss)})
                        </span>
                      )}
                    </span>
                    <span className="sign-row-meta">
                      {r.source === 'team-recording' && <em className="badge">Team Take</em>}
                      {categoryOf(r)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
