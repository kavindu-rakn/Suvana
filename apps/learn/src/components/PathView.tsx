import { useEffect, useRef, useState } from 'react'
import { CURRICULUM_UNITS } from '../data/curriculum'
import { glossLabel } from '../data/translations'
import { listAttempts } from '../learner/attemptLog'
import type { AttemptLogEntry } from '../learner/attemptLog'
import { starsFor, unitState } from '../learner/game'
import { summarizeAll } from '../learner/mastery'
import { clearSession, startUnitSession } from '../learner/session'
import type { PracticeSession } from '../learner/session'
import { listRecordings } from '../storage/recordingStore'
import { loadReferenceFrames, loadReferenceIndex } from '../storage/bundledReferences'
import { pickReferenceList } from '../storage/references'
import { safeLoad } from '../storage/safeLoad'
import { StorageNotice } from '../storage/StorageNotice'
import { toMeta } from '../vision/types'
import type { RecordingMeta, SignRecording } from '../vision/types'
import { SkeletonPlayer } from './SkeletonPlayer'
import './PathView.css'

export function PathView({ onPractise, onSession }: {
  onPractise: (gloss: string) => void
  onSession: (session: PracticeSession) => void
}) {
  const [attempts, setAttempts] = useState<AttemptLogEntry[]>([])
  const [references, setReferences] = useState<RecordingMeta[]>([])
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
      setReferences(pickReferenceList([...local.map(toMeta), ...index]))
      setAttempts(log)
      setStorageOk(ok)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])
  const unit = CURRICULUM_UNITS.find(item => item.id === detail)
  const available = new Set(references.map(rec => rec.gloss))
  const ready = (signs: string[]) => signs.every(gloss => available.has(gloss))
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
  return <section className="path-view" aria-labelledby="path-title">
    {!unit && <header className="path-heading">
      <p className="pane-label">One step at a time</p>
      <h1 id="path-title">Your learning path</h1>
      <p>Watch a sign, then try it. Earn a star on each sign to open the next unit.</p>
      <p>Want to choose your own sign? Free practice is always open.</p>
    </header>}
    <StorageNotice storageOk={storageOk} />
    {unit ? <div className="path-detail">
      <button className="btn ghost" onClick={() => { previewRequest.current++; setDetail(null); setPreview(null); setNotice('') }}>Back to path</button>
      <h2 id="path-title">{unit.title}</h2><p>{unit.description}</p>
      {unitState(unit, CURRICULUM_UNITS, attempts) === 'locked' && <p>Pass the earlier units to practise this one. You can watch its signs now.</p>}
      <button className="btn" disabled={unitState(unit, CURRICULUM_UNITS, attempts) === 'locked' || !ready(unit.signs) || unit.status !== 'approved'} onClick={() => {
        onSession(startUnitSession(unit, summarizeAll(references.map(rec => rec.gloss), attempts)))
      }}>Practise this unit</button>
      <p className="path-note">Up to 8 signs, with reviews mixed in. One scored try finishes each step.</p>
      <ul className="path-signs">{unit.signs.map(gloss => {
        const stars = starsFor(gloss, attempts)
        const locked = unitState(unit, CURRICULUM_UNITS, attempts) === 'locked'
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
      const state = unitState(item, CURRICULUM_UNITS, attempts)
      const stars = item.signs.reduce((sum, gloss) => sum + starsFor(gloss, attempts), 0)
      return <li key={item.id}><button className="path-card" data-state={state} onClick={() => { setDetail(item.id); setPreview(null); setNotice('') }}>
        <span className="path-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
        <span className="path-card-copy"><strong>{item.title}</strong><span>{item.description}</span><span>{item.signs.length} signs · {stars}/{item.signs.length * 3} stars</span></span>
        <span className="path-state">{!ready(item.signs) || item.status !== 'approved' ? 'Preview' : { locked: 'Locked', open: 'Open', passed: 'Passed', mastered: 'Mastered' }[state]}</span>
      </button></li>
    })}</ol>}
  </section>
}
