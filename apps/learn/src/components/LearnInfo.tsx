import { useRef } from 'react'
import { Info, X } from 'lucide-react'
import { Attribution } from './Attribution'
import './LearnInfo.css'

/** Native modal keeps the background inert and restores focus to its trigger. */
export function LearnInfo() {
  const dialog = useRef<HTMLDialogElement>(null)
  return <div className="learn-info">
    <button className="learn-info-trigger" aria-label="About Suvana Learn" aria-haspopup="dialog" onClick={() => dialog.current?.showModal()}>
      <Info size={18} aria-hidden="true" />
    </button>
    <dialog ref={dialog} className="learn-info-dialog" aria-labelledby="learn-info-title" data-lenis-prevent="" onKeyDown={event => event.stopPropagation()}>
      <div className="learn-info-heading">
        <div><span className="learn-info-kicker">SUVANA LEARN</span><h2 id="learn-info-title">About this edition</h2></div>
        <button className="learn-info-close" aria-label="Close information" autoFocus onClick={() => dialog.current?.close()}><X size={22} aria-hidden="true" /></button>
      </div>
      <div className="learn-info-body">
        <Attribution />
        <section className="learn-info-privacy" aria-labelledby="learn-info-privacy-title">
          <h3 id="learn-info-privacy-title">Private by design</h3>
          <p>Hand tracking runs fully in your browser (MediaPipe HandLandmarker) — no video ever leaves your device.</p>
        </section>
      </div>
    </dialog>
  </div>
}
