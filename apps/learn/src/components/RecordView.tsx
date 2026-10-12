import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, Circle, Square, X } from 'lucide-react'
import { useHandTracking } from '../vision/useHandTracking'
import { handCoverage } from '../vision/types'
import type { HandFrame, RecordingMeta, SignRecording } from '../vision/types'
import { toMeta } from '../vision/types'
import { listRecordings, saveRecording } from '../storage/recordingStore'
import { loadReferenceFrames, loadReferenceIndex } from '../storage/bundledReferences'
import { pickReferenceList } from '../storage/references'
import { glossLabel } from '../data/translations'
import { CameraStage } from './CameraStage'
import { SkeletonPlayer } from './SkeletonPlayer'
import { CategorySignNavigator } from './CategorySignNavigator'

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
  /**
   * Who performed the take. This is written into every saved recording's
   * provenance, so it must never be a placeholder nobody chose: it starts
   * empty rather than at "Dev Team", and the record button stays disabled
   * until it is filled. It persists on edit, not only on save, so the name is
   * genuinely remembered on the next visit.
   */
  const [signer, setSigner] = useState(() => localStorage.getItem(SIGNER_KEY) ?? '')

  function updateSigner(next: string) {
    setSigner(next)
    try {
      localStorage.setItem(SIGNER_KEY, next)
    } catch {
      /* Private-mode Safari throws; the field still works for this session. */
    }
  }

  const [count, setCount] = useState(COUNTDOWN_S)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [review, setReview] = useState<SignRecording | null>(null)
  const [justSaved, setJustSaved] = useState(false)
  const [saveError, setSaveError] = useState('')

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
    setReview(null)
    setPhase('idle')
    setJustSaved(true)
    savedFlashRef.current = window.setTimeout(() => setJustSaved(false), 3000)
  }

  const [isBrowsing, setIsBrowsing] = useState(false)

  // Sync isBrowsing if selected changes
  useEffect(() => {
    if (selected || isCustomMode) {
      setIsBrowsing(false)
    }
  }, [selected, isCustomMode])

  const coverage = review ? handCoverage(review.frames) : 0

  return (
    <div className="aww-practice-env aww-studio-env" data-phase={phase}>
      {/* The 50/50 Dual Studio View */}
      <div className="aww-split-screen">
        {/* Left Pane: Target Reference Benchmark or In-Pane Category & Sign Browser */}
        <div className="aww-pane aww-pane-left">
          {isBrowsing || (!selected && !isCustomMode) ? (
            <CategorySignNavigator
              references={references}
              mode="record"
              selectedId={selected?.id}
              onSelect={(rec) => {
                setSelected(rec)
                setIsCustomMode(false)
                setIsBrowsing(false)
              }}
              onCreateCustom={(gloss) => {
                setCustomGloss(gloss)
                setIsCustomMode(true)
                setSelected(null)
                setIsBrowsing(false)
              }}
            />
          ) : (
            <>
              {/* One back affordance, same as Practice: the round chevron. It
                  replaces the old toolbar's "Active Sign" / "Browse Categories"
                  buttons and the header's "← Categories" button, which all ran
                  the same setIsBrowsing(true). */}
              <div className="aww-pane-header aww-ref-header">
                {phase !== 'recording' && phase !== 'countdown' && (
                  <button
                    className="aww-back-round"
                    onClick={() => setIsBrowsing(true)}
                    aria-label="Choose a different sign"
                  >
                    <ChevronLeft size={20} aria-hidden="true" />
                  </button>
                )}
                <div className="aww-ref-heading">
                  {/* "Reference", not "Benchmark Reference": the pill below
                      already says which kind, and Practice's pane uses the
                      same one-word kicker. */}
                  <p className="aww-pane-label">Reference</p>
                  <h2 className="aww-pane-title">
                    {isCustomMode ? 'New sign' : selected ? glossLabel(selected.gloss) : 'Choose a sign'}
                  </h2>
                  {/* No separate meaning line: glossLabel() already renders
                      "GLOSS (meaning)". The old toolbar printed both and read
                      "ADINAWA (pull) (pull)". */}
                  {!isCustomMode && selected && (
                    <div className="studio-ref-meta">
                      {selected.source === 'team-recording' ? (
                        <span className="studio-ref-pill provisional">Team provisional</span>
                      ) : (
                        <span className="studio-ref-pill">Dataset</span>
                      )}
                      <span className="studio-ref-pill">{(selected.durationMs / 1000).toFixed(1)}s</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="aww-pane-content">
                {isCustomMode ? (
                  <div className="studio-custom-prompt">
                    {/* No heading here — the pane header above already says
                        "New sign". The two used to sit 60px apart saying the
                        same thing, and overlapped at wider gloss lengths. */}
                    <p className="studio-prompt-desc">
                      Enter a unique gloss name below. Once recorded and saved, this sign will immediately become part of your local reference library.
                    </p>
                    <input
                      type="text"
                      className="studio-custom-input"
                      value={customGloss}
                      onChange={(e) => setCustomGloss(e.target.value.toUpperCase())}
                      /* One example, not three: the field is centred, uppercase
                         and 20px, so a longer placeholder clipped mid-word. */
                      placeholder="e.g. MORNING"
                      autoFocus
                      disabled={phase === 'countdown' || phase === 'recording'}
                    />
                  </div>
                ) : selected && reference ? (
                  <SkeletonPlayer
                    frames={reference.frames}
                    videoWidth={reference.videoWidth}
                    videoHeight={reference.videoHeight}
                    /* One neutral colour, as Practice does it: the benchmark is
                       a diagram to copy, and the default two-tone left/right
                       hand coding says nothing about the sign. The take replay
                       below keeps the coding, so it matches the live overlay. */
                    colorOverride="#e6eeec"
                  />
                ) : selected && refFailed ? (
                  <p className="camera-error">Could not load benchmark reference.</p>
                ) : !selected ? (
                  <p className="hint-text">Choose a sign to benchmark against.</p>
                ) : (
                  <p className="hint-text">Loading benchmark frames...</p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right Pane: Live Capture Stage / Review Replay */}
        <div className="aww-pane aww-pane-right" data-camera-status={tracking.status}>
          <div className="aww-pane-header">
            <div>
              <p className="aww-pane-label">{phase === 'review' ? 'Take Review' : 'Live Motion Capture'}</p>
              {/* One labelled line, not three bare numbers. It stays visible
                  whenever the camera runs rather than only while recording:
                  a low frame rate has to be caught while framing the shot,
                  not discovered after a take is already spoiled. */}
              {tracking.stats && phase !== 'review' && (
                <span
                  className="studio-telemetry"
                  data-rate={tracking.stats.fps < 15 ? 'low' : undefined}
                >
                  {tracking.stats.fps.toFixed(0)} fps &middot;{' '}
                  {tracking.stats.inferenceMs.toFixed(1)} ms tracking &middot;{' '}
                  {tracking.stats.width}&times;{tracking.stats.height}
                </span>
              )}
            </div>

            {/* Who is performing the take. It is written into every saved
                recording's provenance, so it belongs beside the camera it
                describes rather than in a toolbar across the top. */}
            <div className="studio-tool-right">
              <div className="studio-signer-input-wrap">
                <label className="signer-label" htmlFor="studio-signer">
                  Signer
                </label>
                <input
                  id="studio-signer"
                  type="text"
                  className="studio-signer-input"
                  value={signer}
                  onChange={(e) => updateSigner(e.target.value)}
                  placeholder="Your name"
                  disabled={phase === 'countdown' || phase === 'recording'}
                />
              </div>
              {/* Shown on focus only — a permanent caption over the camera feed
                  would be clutter, but the field's persistence is worth stating
                  the moment someone types in it. */}
              <span className="signer-hint">Saved in this browser</span>
              {justSaved && <span className="studio-saved-pill">Saved take</span>}
            </div>
          </div>

          {/* Live Camera View */}
          <div className={`aww-camera-container ${phase === 'review' ? 'hidden' : ''}`}>
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
                  <p className="aww-camera-intro-lead">Record a reference take.</p>
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

          {/* Capture controls, anchored to this pane — one action at a time,
              matching Practice: action bottom-left, timer top-right, the
              countdown centred over the video. */}
          {phase !== 'review' && tracking.status === 'running' && (
            <>
              {phase === 'countdown' && (
                <div className="aww-cam-countdown" aria-hidden="true">
                  {count}
                </div>
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
                    disabled={!activeGloss.trim() || !signer.trim()}
                  >
                    <Circle size={15} fill="currentColor" strokeWidth={0} aria-hidden="true" />
                    {!activeGloss.trim()
                      ? 'Select a sign first'
                      : !signer.trim()
                        ? 'Add signer name'
                        : 'Record take'}
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
                    Stop &amp; review
                  </button>
                )}
              </div>
            </>
          )}

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

      {/* Review Take Overlay Bar */}
      {phase === 'review' &&
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
                Save to library
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
                Discard take
              </button>
            </div>
          </div>
        )}

    </div>
  )
}
