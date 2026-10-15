import type { CurriculumUnit } from '../data/curriculum'
import type { AttemptLogEntry } from './attemptLog'
import { unitState } from './game'
import { summarizeAll } from './mastery'
import { startUnitSession, UNIT_SESSION_SIZE } from './session'
import type { PracticeSession } from './session'

// Same-page handoff survives blocked sessionStorage. Clear it after Practice
// loads; persistent progress still belongs only to the existing stores.
let pendingHeroSession: PracticeSession | null = null
export function queueHeroSession(session: PracticeSession): void { pendingHeroSession = session }
export function readHeroSession(): PracticeSession | null { return pendingHeroSession }
export function clearHeroSession(): void { pendingHeroSession = null }

/** Hero is an explicit curriculum entry, so its first sign wins over the
 * review interleave. The rest of the finite plan still uses L-13's policy. */
export function startHeroSession(units: CurriculumUnit[], glosses: string[], attempts: AttemptLogEntry[]): PracticeSession | null {
  const available = new Set(glosses)
  const usable = units.filter(unit => unit.status === 'approved' && unit.signs.length > 0
    && unit.signs.every(gloss => available.has(gloss)) && unitState(unit, units, attempts) !== 'locked')
  const unit = usable.find(item => unitState(item, units, attempts) === 'open') ?? usable[0]
  if (!unit) return null
  const summaries = summarizeAll(glosses, attempts)
  const session = startUnitSession(unit, summaries)
  const first = unit.signs[0]
  const summary = summaries.find(item => item.gloss === first)!
  const ordered = [first, ...session.glosses.filter(gloss => gloss !== first)].slice(0, UNIT_SESSION_SIZE)
  return { ...session, glosses: ordered,
    startMastery: { ...session.startMastery, [first]: summary.mastery },
    recommendations: ordered.map(gloss => gloss === first
      ? { gloss, kind: summary.attempts === 0 ? 'new' : 'practice', reason: 'First sign in this unit.' }
      : session.recommendations!.find(item => item.gloss === gloss)!),
  }
}
