import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { band } from '../scoring/band'
import { markOnboardingSeen } from './onboardingFlag'
import './Onboarding.css'

// Band labels come from band() so the guide can never drift from the result card.
const GREAT = band(85).label
const OK = band(60).label
const LOW = band(0).label

// Generic practice guidance only: no sign content. Step 2 describes today's
// controls, including the Watch-to-Try handoff. No SSL content is supplied here.
const STEPS: { title: string; body: ReactNode }[] = [
  {
    title: 'Frame yourself',
    body: (
      <>
        <p>
          Sit back so your head, your shoulders and both hands fit in the camera view. Light
          from in front of you works best.
        </p>
        <p>
          Record unlocks when the <strong>Hands in frame</strong> marker shows your hands are
          being tracked.
        </p>
      </>
    ),
  },
  {
    title: 'Watch, then sign',
    body: (
      <>
        <p>
          Watch the reference at normal speed. Change the playback speed in Settings if you like.
          Choose <strong>Try</strong> when you are ready, then turn on your camera.
        </p>
        <p>
          References are enlarged and centred on the hands.
        </p>
        <p>
          Press <strong>Record</strong> (or Space). After a 3-second countdown, sign; press Space
          again to stop early.
        </p>
        <p>
          The reference and your camera are both shown mirrored, so copy the reference as if it
          were your reflection. Signing with your other hand is fine: each take is scored both
          ways and the better score counts.
        </p>
      </>
    ),
  },
  {
    title: 'What the score means',
    body: (
      <>
        <p>
          The score, from 0 to 100, says how closely your hand movement matched one reference
          recording of the sign.
        </p>
        <ul className="onb-bands">
          <li>
            <span className="onb-band onb-band-good">85 and above</span> {GREAT}
          </li>
          <li>
            <span className="onb-band onb-band-ok">60 to 84</span> {OK}
          </li>
          <li>
            <span className="onb-band onb-band-low">Below 60</span> {LOW}
          </li>
        </ul>
        <p>
          It is a match score, not a verdict on whether your sign is correct: the reference is
          one person&apos;s signing, and the hand tracker can miss things.
        </p>
      </>
    ),
  },
]

/**
 * How Practice works, in three short steps. Shown on a learner's first sign and
 * from the "How it works" link. A native modal <dialog>: the browser traps
 * focus, makes the page behind it inert and handles close requests (Esc, the
 * Android back gesture).
 */
export function Onboarding({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [step, setStep] = useState(0)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      setStep(0)
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  // Every way out (buttons, Esc, back gesture) ends in the dialog's close event.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const handleClose = () => {
      markOnboardingSeen()
      onClose()
    }
    dialog.addEventListener('close', handleClose)
    return () => dialog.removeEventListener('close', handleClose)
  }, [onClose])

  const last = step === STEPS.length - 1
  const current = STEPS[step]

  return (
    <dialog ref={dialogRef} className="onb" aria-labelledby="onb-title">
      <div className="onb-head">
        <p className="onb-count">
          How it works · {step + 1} of {STEPS.length}
        </p>
        <button
          type="button"
          className="onb-close"
          onClick={() => dialogRef.current?.close()}
          aria-label="Close"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <h2 id="onb-title" className="onb-title">
        {current.title}
      </h2>
      <div className="onb-body">{current.body}</div>
      <div className="onb-dots" aria-hidden="true">
        {STEPS.map((s, i) => (
          <span key={s.title} className={i === step ? 'is-current' : undefined} />
        ))}
      </div>
      <div className="onb-actions">
        {step > 0 && (
          <button type="button" className="btn btn-ghost" onClick={() => setStep(step - 1)}>
            Back
          </button>
        )}
        {last ? (
          <button
            type="button"
            className="btn"
            onClick={() => dialogRef.current?.close()}
            autoFocus
          >
            Got it
          </button>
        ) : (
          <button type="button" className="btn" onClick={() => setStep(step + 1)} autoFocus>
            Next
          </button>
        )}
      </div>
    </dialog>
  )
}
