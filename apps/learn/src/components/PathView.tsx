import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowUpRight, Play, Star, X } from 'lucide-react'
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
import { PathMap } from './PathMap'
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
  const previewPanel = useRef<HTMLElement>(null)
  const watchButton = useRef<HTMLButtonElement | null>(null)
  const returnToLesson = useRef<string | null>(null)
  useEffect(() => {
    if (detail !== null || returnToLesson.current === null) return
    const button = document.getElementById(`path-unit-${returnToLesson.current}`)
    if (button) {
      button.scrollIntoView({ block: 'center' })
      button.focus({ preventScroll: true })
      returnToLesson.current = null
    }
  }, [detail])
  useEffect(() => {
    if (!preview) return
    previewTitle.current?.focus({ preventScroll: true })
    previewPanel.current?.scrollIntoView({ block: 'start', behavior: 'instant' })
  }, [preview])
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
  const unitStars = unit?.signs.reduce((total, gloss) => total + starsFor(gloss, attempts), 0) ?? 0
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
      <button className="path-back" onClick={() => { previewRequest.current++; setDetail(null); setPreview(null); setNotice('') }}><ArrowLeft size={16} aria-hidden="true" />Back to path</button>
      <header className="path-lesson-header">
        <div className="path-lesson-heading">
          <span className="path-lesson-kicker">Lesson {String(CURRICULUM_UNITS.indexOf(unit) + 1).padStart(2, '0')}</span>
          <h2 id="path-title">{unit.title}</h2>
          <div className="path-lesson-meta"><span>{unit.signs.length} signs</span><span className="path-lesson-total" role="img" aria-label={`${unitStars} of ${unit.signs.length * 3} stars`}><Star className="path-earned-star" size={15} aria-hidden="true" /><span aria-hidden="true">{unitStars}/{unit.signs.length * 3}</span></span></div>
        </div>
        <button className="path-start" disabled={state === 'locked' || state === 'preview'} onClick={() => {
          onSession(startUnitSession(unit, summarizeAll(contentIndex.map(rec => rec.gloss), attempts)))
        }}>Practise this unit<ArrowUpRight size={18} aria-hidden="true" /></button>
        {coverage?.preview && <p className="path-lesson-notice">Preview: {coverage.covered} of {coverage.total} signs available</p>}
        {state === 'locked' && <p className="path-lesson-notice">Pass the earlier units to practise this one. You can watch its signs now.</p>}
      </header>
      {notice && <p className="path-watch-status" role="status">{notice}</p>}
      {preview && <section ref={previewPanel} className="path-preview" aria-label={`Watch ${glossLabel(preview.gloss)}`}>
        <div className="path-preview-heading">
          <div><span className="path-lesson-kicker">Reference</span><h3 ref={previewTitle} tabIndex={-1}>{glossLabel(preview.gloss)}</h3></div>
          <button className="path-preview-close" aria-label="Close reference" onClick={() => { previewRequest.current++; setPreview(null); setNotice(''); watchButton.current?.focus() }}><X size={20} aria-hidden="true" /></button>
        </div>
        <SkeletonPlayer frames={preview.frames} videoWidth={preview.videoWidth} videoHeight={preview.videoHeight} />
      </section>}
      <h3 className="path-list-heading" id="path-signs-title">Signs in this lesson</h3>
      <ul className="path-signs" aria-labelledby="path-signs-title">{unit.signs.map((gloss, index) => {
        const stars = starsFor(gloss, attempts)
        const locked = state === 'locked'
        return <li key={gloss}>
          <span className="path-sign-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
          <div className="path-sign-copy"><strong>{glossLabel(gloss)}</strong><span className="path-sign-stars" role="img" aria-label={`${stars} of 3 stars`}>{[0, 1, 2].map(index => <Star key={index} size={13} className={index < stars ? 'path-earned-star' : undefined} aria-hidden="true" />)}</span></div>
          <div className="path-actions">
            <button className="path-action path-action-watch" disabled={!available.has(gloss)} onClick={event => { watchButton.current = event.currentTarget; void watch(gloss) }}><Play size={14} aria-hidden="true" />Watch<span className="sr-only"> {gloss}</span></button>
            <button className="path-action path-action-try" disabled={locked || !available.has(gloss)} onClick={() => { clearSession(); onPractise(gloss) }}>Try<ArrowUpRight size={15} aria-hidden="true" /><span className="sr-only"> {gloss}</span></button>
          </div>
        </li>
      })}</ul>
    </div> : <PathMap>{[...CURRICULUM_UNITS.map((item, index) => {
      const state = pathUnitState(item, CURRICULUM_UNITS, attempts, contentIndex)
      const coverage = contentCoverage(item.signs, contentIndex)
      const signStars = item.signs.map(gloss => starsFor(gloss, attempts))
      const stars = signStars.reduce<number>((sum, count) => sum + count, 0)
      return <button key={item.id} id={`path-unit-${item.id}`} className="path-card" data-state={state} onClick={() => { returnToLesson.current = item.id; setDetail(item.id); setPreview(null); setNotice('') }}>
        <span className="path-card-heading"><span className="path-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><LessonStars stars={signStars} locked={state === 'locked'} /></span>
        <span className="path-card-copy"><strong>{item.title}</strong></span>
        <span className="path-card-meta"><span>{item.signs.length} signs</span><span className="path-star-count" role="img" aria-label={`${stars} of ${item.signs.length * 3} stars`}>
          <Star className="path-earned-star" size={12} aria-hidden="true" /><span aria-hidden="true">{stars}/{item.signs.length * 3}</span>
        </span>{coverage.preview && <span className="path-card-notice">Preview: {coverage.covered} of {coverage.total} signs available</span>}</span>
        {state !== 'locked' && <span className="sr-only">{state === 'preview' ? 'Preview' : 'Available'}</span>}
      </button>
    }), <button key="sentence-challenge" id="path-unit-sentence-challenge" className="path-card sentence-entry" data-state={sentencesUnlocked ? 'open' : 'locked'} disabled={!sentencesUnlocked} onClick={() => { returnToLesson.current = 'sentence-challenge'; setDetail('sentence-challenge') }}>
      <span className="path-card-heading"><span className="path-number" aria-hidden="true">{String(CURRICULUM_UNITS.length + 1).padStart(2, '0')}</span><LessonStars stars={[]} locked={!sentencesUnlocked} /></span>
      <span className="path-card-copy"><strong>Sentence challenge</strong><span className="sr-only">{sentencesUnlocked ? 'Watch, try, then practise from the dataset label.' : `Pass ${lastUnit?.title ?? 'the earlier units'} to open this challenge.`}</span></span>
      <span className="path-card-meta"><span className="path-card-notice">{SENTENCE_EXPERIMENTAL_LABEL}</span></span>
    </button>]}</PathMap>}
  </section>
}
