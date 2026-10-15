import { useEffect, useRef } from 'react'
import { CURRICULUM_UNITS } from '../data/curriculum'
import type { AttemptLogEntry } from '../learner/attemptLog'
import { dailyGoal, starsFor, unitState } from '../learner/game'
import type { PracticeSession } from '../learner/session'
import './SessionComplete.css'

export function SessionComplete({ session, attempts, onContinue }: {
  session: PracticeSession; attempts: AttemptLogEntry[]; onContinue: () => void
}) {
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { heading.current?.focus() }, [])
  const before = attempts.filter(entry => entry.sessionId !== session.id)
  const stars = [...new Set(session.glosses)].reduce((sum, gloss) =>
    sum + Math.max(0, starsFor(gloss, attempts) - starsFor(gloss, before)), 0)
  const goal = dailyGoal(attempts)
  const next = CURRICULUM_UNITS.find(unit => unit.status === 'approved'
    && unitState(unit, CURRICULUM_UNITS, attempts) === 'open')
  return <section className="session-complete" aria-labelledby="session-complete-title">
    <p className="pane-label">Session complete</p>
    <h1 ref={heading} tabIndex={-1} id="session-complete-title">Nice work!</h1>
    <p>You practised {session.done.length} {session.done.length === 1 ? 'sign' : 'signs'}. Take a break, or keep going.</p>
    <dl className="session-complete-stats">
      <div><dt>New stars</dt><dd>{stars}</dd><p>Stars you added this session.</p></div>
      <div><dt>Today's goal</dt><dd>{Math.min(goal.count, goal.target)}/{goal.target}</dd><p>{goal.met ? 'You reached your goal.' : `${goal.remaining} more scored tries to go.`}</p></div>
    </dl>
    <p className="session-next">{next ? `Next on your path: ${next.title}` : 'You passed every unit. Choose any unit to review.'}</p>
    <p>Open Path to choose a unit. Your progress stays in this browser.</p>
    <button className="btn massive" onClick={onContinue}>Keep practising</button>
  </section>
}
