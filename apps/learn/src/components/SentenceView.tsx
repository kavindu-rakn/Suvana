import { useEffect, useRef, useState } from 'react'
import { SENTENCE_EXPERIMENTAL_LABEL } from '../data/sentences'
import type { SentenceReference } from '../data/sentences'
import { addAttempt } from '../learner/attemptLog'
import { loadReferenceFrames, loadSentenceReferenceIndex } from '../storage/bundledReferences'
import { StorageNotice } from '../storage/StorageNotice'
import { useSignCapture } from '../vision/useSignCapture'
import type { SignRecording } from '../vision/types'
import { CameraStage } from './CameraStage'
import { SkeletonPlayer } from './SkeletonPlayer'
import { availableSentences, scoreSentenceTake, sentenceCaptureMs } from './sentenceChallenge'
import './SentenceView.css'

type Stage = 'watch' | 'try' | 'recall'
type SentenceResult = NonNullable<ReturnType<typeof scoreSentenceTake>>

export function SentenceView({ onBack }: { onBack: () => void }) {
  const [sentences, setSentences] = useState<readonly SentenceReference[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<SentenceReference | null>(null)
  const [reference, setReference] = useState<SignRecording | null>(null)
  const [referenceLoading, setReferenceLoading] = useState(false)
  const [stage, setStage] = useState<Stage>('watch')
  const [revealed, setRevealed] = useState(false)
  const [hasTried, setHasTried] = useState(false)
  const [result, setResult] = useState<SentenceResult | null>(null)
  const [notice, setNotice] = useState('')
  const [storageOk, setStorageOk] = useState(true)
  const request = useRef(0)
  const alive = useRef(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const resultHeading = useRef<HTMLHeadingElement>(null)

  const capture = useSignCapture(take => {
    if (!selected || !reference || result || stage === 'watch') return
    const scored = scoreSentenceTake(take, reference)
    if (!scored) {
      setNotice('No usable hand movement was captured. Try again; no score was saved.')
      return
    }
    setResult(scored)
    setNotice('')
    if (stage === 'try') setHasTried(true)
    // Every take stays in the sentence lane, including Recall. It must never
    // earn isolated-sign stars or enter an isolated-sign recommendation queue.
    void addAttempt({
      id: scored.attempt.id, gloss: selected.gloss, referenceId: selected.refId,
      score: scored.match.score, stage: 'sentence',
      revealed: stage === 'recall' ? revealed : undefined,
      worstFingers: [], createdAt: scored.attempt.createdAt,
    }).catch(() => { if (alive.current) setStorageOk(false) })
  })
  const { stop } = capture.tracking
  const busy = capture.phase !== 'idle'
  const captureMs = reference ? sentenceCaptureMs(reference) : 0
  const referenceVisible = stage !== 'recall' || revealed || result !== null

  useEffect(() => {
    alive.current = true
    return () => { alive.current = false }
  }, [])
  useEffect(() => {
    let cancelled = false
    void loadSentenceReferenceIndex().then(index => {
      if (cancelled) return
      setSentences(availableSentences(index))
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])
  useEffect(() => {
    if (!selected || !reference || stage === 'watch' || result) stop()
  }, [selected, reference, stage, result, stop])
  useEffect(() => { heading.current?.focus() }, [selected])
  useEffect(() => {
    if (!result) return
    resultHeading.current?.focus({ preventScroll: true })
    resultHeading.current?.scrollIntoView({ block: 'start' })
  }, [result])
  useEffect(() => {
    const hidden = () => {
      if (document.hidden && busy) setNotice('Capture stopped while the page was hidden. Try again; no score was saved.')
    }
    document.addEventListener('visibilitychange', hidden)
    return () => document.removeEventListener('visibilitychange', hidden)
  }, [busy])

  function resetCapture() {
    capture.cancel()
    stop()
    setResult(null)
    setNotice('')
  }
  async function select(sentence: SentenceReference) {
    resetCapture()
    const token = ++request.current
    setSelected(sentence)
    setReference(null)
    setReferenceLoading(true)
    setStage('watch')
    setRevealed(false)
    setHasTried(false)
    const recording = await loadReferenceFrames(sentence.file)
    if (!alive.current || token !== request.current) return
    setReferenceLoading(false)
    if (recording?.id === sentence.refId && recording.frames.length > 1 && sentenceCaptureMs(recording) > 0) setReference(recording)
    else setNotice('This sentence reference could not load. Try again.')
  }
  function changeStage(next: Stage) {
    resetCapture()
    setStage(next)
    setRevealed(false)
  }
  function chooseAnother() {
    resetCapture()
    request.current++
    setSelected(null)
    setReference(null)
    setReferenceLoading(false)
  }
  function stopCamera() {
    capture.cancel()
    stop()
    if (busy) setNotice('Capture stopped; no score was saved.')
  }

  return <section className="sentence-view" aria-labelledby="sentence-title" data-stage={selected ? stage : 'list'} data-phase={result ? 'result' : capture.phase} data-capture-ms={captureMs}>
    <button className="btn ghost" onClick={() => { resetCapture(); onBack() }}>Back to path</button>
    <p className="sentence-experimental">{SENTENCE_EXPERIMENTAL_LABEL}</p>
    <header className="sentence-heading">
      <p className="pane-label">Whole recording challenge</p>
      <h1 id="sentence-title" ref={heading} tabIndex={-1}>Sentence challenge</h1>
      <p>Practise one whole recording. Dataset labels are shown as written.</p>
    </header>
    <StorageNotice storageOk={storageOk} />
    {!selected ? <>
      {loading ? <p role="status">Loading sentence references…</p> : sentences.length ? <ul className="sentence-list">{sentences.map(sentence => <li key={sentence.refId}>
        <button className="sentence-choice" onClick={() => void select(sentence)}>
          <span className="sentence-dataset-label">{sentence.datasetLabel}</span>
          {sentence.meaning && <span className="sentence-meaning">{sentence.meaning}</span>}
          <span>Watch this recording</span>
        </button>
      </li>)}</ul> : <div role="status"><p>Sentence references are unavailable. Check your connection and try again.</p><button className="btn" onClick={() => {
        setLoading(true)
        void loadSentenceReferenceIndex().then(index => { if (alive.current) { setSentences(availableSentences(index)); setLoading(false) } })
      }}>Reload sentence references</button></div>}
    </> : <>
      <button className="btn ghost" onClick={chooseAnother}>Choose another sentence</button>
      <h2 className="sentence-dataset-label">{selected.datasetLabel}</h2>
      {selected.meaning && <p className="sentence-meaning">{selected.meaning}</p>}
      <div className="sentence-steps" aria-label="Sentence practice steps">
        <button className="btn ghost" disabled={busy} aria-pressed={stage === 'watch'} onClick={() => changeStage('watch')}>1. Watch</button>
        <button className="btn ghost" disabled={busy || !reference} aria-pressed={stage === 'try'} onClick={() => changeStage('try')}>2. Try</button>
        <button className="btn ghost" disabled={busy || !hasTried} aria-pressed={stage === 'recall'} onClick={() => changeStage('recall')}>3. Recall</button>
      </div>
      <p className="sentence-status" role="status">{referenceLoading ? 'Loading the whole reference…' : capture.phase === 'countdown' ? `Recording starts in ${capture.count}…` : capture.phase === 'recording' ? `Recording: ${(capture.elapsedMs / 1000).toFixed(1)} seconds` : notice}</p>
      {!reference && !referenceLoading && <button className="btn" onClick={() => void select(selected)}>Reload this reference</button>}
      {reference && <>
        <p className="sentence-window">Recording window: {(captureMs / 1000).toFixed(1)} seconds — twice this reference's duration. You can stop when finished.</p>
        <div className="sentence-panels">
          <div className="sentence-panel">
            <h3>{stage === 'recall' && !referenceVisible ? 'From memory' : 'Whole reference'}</h3>
            {referenceVisible ? <div className="sentence-player"><SkeletonPlayer
              key={`${selected.refId}-${stage}`} frames={reference.frames}
              videoWidth={reference.videoWidth} videoHeight={reference.videoHeight}
              fitToFrame={window.innerWidth < 768} autoSpeedUp={false}
            /></div> : <div className="sentence-recall">
              <p>Use the dataset label above as your cue.</p>
              <button className="btn ghost" disabled={busy} onClick={() => setRevealed(true)}>Show reference</button>
            </div>}
            {stage === 'watch' && <button className="btn" onClick={() => changeStage('try')}>My turn</button>}
          </div>
          {stage !== 'watch' && !result && <div className="sentence-panel">
            <h3>Your attempt</h3>
            <p className="sentence-dataset-label">{selected.datasetLabel}</p>
            <div className="sentence-camera"><CameraStage
              videoRef={capture.tracking.videoRef} canvasRef={capture.tracking.canvasRef}
              status={capture.tracking.status} error={capture.tracking.error}
              inferring={capture.tracking.inferring} prepareTracker
              onStart={() => void capture.tracking.start()} onStop={stopCamera}
              idleHint="Turn on the camera when you are ready."
            /></div>
            <div className="sentence-actions">
              {capture.phase === 'countdown' ? <button className="btn ghost" onClick={() => { capture.cancel(); setNotice('Cancelled; no score was saved.') }}>Cancel recording</button>
                : capture.phase === 'recording' ? <button className="btn" onClick={capture.finish}>Finish recording</button>
                : <button className="btn" disabled={capture.tracking.status !== 'running'} onClick={() => { setNotice(''); capture.begin(captureMs) }}>Record sentence</button>}
            </div>
          </div>}
        </div>
        {result && <section className="sentence-result" aria-labelledby="sentence-result-title">
          <h2 id="sentence-result-title" ref={resultHeading} tabIndex={-1}>Whole-sentence match</h2>
          <p className="sentence-score"><output>{Math.round(result.match.score)}</output><span> / 100</span></p>
          <p>Compared with this one whole recording. This score does not prove the sentence is correct.</p>
          {stage === 'recall' && <p>{revealed ? 'Reference shown before recording.' : 'Recorded from the dataset label without showing the reference.'}</p>}
          <div className="sentence-actions">
            <button className="btn" onClick={() => changeStage(stage)}>Try again</button>
            <button className="btn ghost" onClick={() => changeStage('watch')}>Watch again</button>
            {stage === 'try' && <button className="btn" onClick={() => changeStage('recall')}>Try from memory</button>}
          </div>
        </section>}
      </>}
    </>}
  </section>
}
