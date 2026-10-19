import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { CURRICULUM_UNITS } from '../data/curriculum'
import { SENTENCE_EXPERIMENTAL_LABEL } from '../data/sentences'
import { glossLabel } from '../data/translations'
import { listAttempts } from '../learner/attemptLog'
import type { AttemptLogEntry } from '../learner/attemptLog'
import { starsFor } from '../learner/game'
import { pathUnitState } from '../learner/pathContent'
import { summarizeAll } from '../learner/mastery'
import { clearSession, startUnitSession } from '../learner/session'
import type { PracticeSession } from '../learner/session'
import { listRecordings } from '../storage/recordingStore'
import { contentCoverage, loadReferenceFrames, loadReferenceIndex } from '../storage/bundledReferences'
import { pickReferenceList } from '../storage/references'
import { safeLoad } from '../storage/safeLoad'
import { StorageNotice } from '../storage/StorageNotice'
import { toMeta } from '../vision/types'
import type { RecordingMeta, SignRecording } from '../vision/types'
import { SkeletonPlayer } from './SkeletonPlayer'
import { LessonStars } from './LessonStars'
import './PathView.css'
import './SentenceView.css'

const SentenceView = lazy(() => import('./SentenceView').then(module => ({ default: module.SentenceView })))

export function PathView({ onPractise, onSession }: {
  onPractise: (gloss: string) => void
  onSession: (session: PracticeSession) => void
}) {
  const [attempts, setAttempts] = useState<AttemptLogEntry[]>([])
  const [references, setReferences] = useState<RecordingMeta[]>([])
  const [contentIndex, setContentIndex] = useState<RecordingMeta[]>([])
  const [locals, setLocals] = useState<SignRecording[]>([])
  const [loading, setLoading] = useState(true)
  const [storageOk, setStorageOk] = useState(true)
  const [detail, setDetail] = useState<string | null>(null)
  const [preview, setPreview] = useState<SignRecording | null>(null)
  const [notice, setNotice] = useState('')
  const previewRequest = useRef(0)
  const previewTitle = useRef<HTMLHeadingElement>(null)
  useEffect(() => { if (preview) previewTitle.current?.focus() }, [preview])
  useEffect(() => () => { previewRequest.current++ }, [])
  useEffect(() => {
    let cancelled = false
    void safeLoad(listRecordings, loadReferenceIndex, listAttempts).then(({ data: [local, index, log], storageOk: ok }) => {
      if (cancelled) return
      setLocals(local)
      setContentIndex(index)
      const available = new Set(index.map(rec => rec.gloss))
      setReferences(pickReferenceList([...local.map(toMeta), ...index]).filter(rec => available.has(rec.gloss)))
      setAttempts(log)
      setStorageOk(ok)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])
  const unit = CURRICULUM_UNITS.find(item => item.id === detail)
  const available = new Set(contentIndex.map(rec => rec.gloss))
  const state = unit ? pathUnitState(unit, CURRICULUM_UNITS, attempts, contentIndex) : null
  const coverage = unit ? contentCoverage(unit.signs, contentIndex) : null
  const watch = async (gloss: string) => {
    const request = ++previewRequest.current
    setPreview(null)
    setNotice('Loading the reference…')
    const rec = references.find(item => item.gloss === gloss)
    const full = rec?.file ? await loadReferenceFrames(rec.file) : locals.find(item => item.id === rec?.id)
    if (request !== previewRequest.current) return
    setPreview(full ?? null)
    setNotice(full ? '' : 'This reference could not load. Try again.')
  }
  if (loading) return <p role="status" className="empty-state">Loading your path…</p>
  const lastUnit = CURRICULUM_UNITS[CURRICULUM_UNITS.length - 1]
  const lastState = lastUnit ? pathUnitState(lastUnit, CURRICULUM_UNITS, attempts, contentIndex) : 'locked'
  const sentencesUnlocked = lastState === 'passed' || lastState === 'mastered'
  if (detail === 'sentence-challenge' && sentencesUnlocked) return <Suspense fallback={<p role="status">{SENTENCE_EXPERIMENTAL_LABEL} — Loading…</p>}>
    <SentenceView onBack={() => setDetail(null)} />
  </Suspense>
  return <section className="path-view" aria-label={unit ? undefined : 'Your learning path'} aria-labelledby={unit ? 'path-title' : undefined}>
    <StorageNotice storageOk={storageOk} />
    {unit ? <div className="path-detail">
      <button className="btn ghost" onClick={() => { previewRequest.current++; setDetail(null); setPreview(null); setNotice('') }}>Back to path</button>
      <h2 id="path-title">{unit.title}</h2>
      {coverage?.preview && <p>Preview: {coverage.covered} of {coverage.total} signs available</p>}
      {state === 'locked' && <p>Pass the earlier units to practise this one. You can watch its signs now.</p>}
      <button className="btn" disabled={state === 'locked' || state === 'preview'} onClick={() => {
        onSession(startUnitSession(unit, summarizeAll(contentIndex.map(rec => rec.gloss), attempts)))
      }}>Practise this unit</button>
      <p className="path-note">Up to 8 signs, with reviews mixed in. One scored try finishes each step.</p>
      <ul className="path-signs">{unit.signs.map(gloss => {
        const stars = starsFor(gloss, attempts)
        const locked = state === 'locked'
        return <li key={gloss}>
          <div><strong>{glossLabel(gloss)}</strong><span aria-label={`${stars} of 3 stars`}>{'★'.repeat(stars)}{'☆'.repeat(3 - stars)}</span></div>
          <div className="path-actions">
            <button className="btn ghost" disabled={!available.has(gloss)} onClick={() => void watch(gloss)}>Watch<span className="sr-only"> {gloss}</span></button>
            <button className="btn" disabled={locked || !available.has(gloss)} onClick={() => { clearSession(); onPractise(gloss) }}>Try<span className="sr-only"> {gloss}</span></button>
          </div>
        </li>
      })}</ul>
      <p role="status">{notice}</p>
      {preview && <section className="path-preview" aria-label={`Watch ${glossLabel(preview.gloss)}`}>
        <h3 ref={previewTitle} tabIndex={-1}>{glossLabel(preview.gloss)}</h3><SkeletonPlayer frames={preview.frames} videoWidth={preview.videoWidth} videoHeight={preview.videoHeight} />
      </section>}
    </div> : <ol className="path-units">{CURRICULUM_UNITS.map((item, index) => {
      const state = pathUnitState(item, CURRICULUM_UNITS, attempts, contentIndex)
      const coverage = contentCoverage(item.signs, contentIndex)
      const signStars = item.signs.map(gloss => starsFor(gloss, attempts))
      const stars = signStars.reduce<number>((sum, count) => sum + count, 0)
      return <li key={item.id}><button className="path-card" data-state={state} onClick={() => { setDetail(item.id); setPreview(null); setNotice('') }}>
        <span className="path-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
        <span className="path-card-copy"><strong>{item.title}</strong><span>{item.signs.length} signs · {stars}/{item.signs.length * 3} stars</span>{coverage.preview && <span>Preview: {coverage.covered} of {coverage.total} signs available</span>}</span>
        {state !== 'locked' && <span className="sr-only">{state === 'preview' ? 'Preview' : 'Available'}</span>}
        <LessonStars stars={signStars} locked={state === 'locked'} />
      </button></li>
    })}<li><button className="path-card sentence-entry" data-state={sentencesUnlocked ? 'open' : 'locked'} disabled={!sentencesUnlocked} onClick={() => setDetail('sentence-challenge')}>
      <span className="path-number" aria-hidden="true">{String(CURRICULUM_UNITS.length + 1).padStart(2, '0')}</span>
      <span className="path-card-copy"><strong>Sentence challenge</strong><span>{SENTENCE_EXPERIMENTAL_LABEL}</span><span>{sentencesUnlocked ? 'Watch, try, then practise from the dataset label.' : `Pass ${lastUnit?.title ?? 'the earlier units'} to open this challenge.`}</span></span>
      <LessonStars stars={[]} locked={!sentencesUnlocked} />
    </button></li></ol>}
  </section>
}
