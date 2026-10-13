import type { CurriculumUnit } from '../data/curriculum'
import type { AttemptLogEntry } from './attemptLog'
import { summarizeGloss } from './mastery'

// Product reward rules approved by kvn in chat, 13 Oct 2026. These match-score
// thresholds are not calibrated claims of correctness; band() stays 60/85.
export const TRY_FIRST_STAR = 60
export const TRY_SECOND_STAR = 70
export const RECALL_THIRD_STAR = 60
export const DAILY_GOAL = 5
export const UNIT_PASS_STARS = 1

export type Stars = 0 | 1 | 2 | 3
export type UnitState = 'locked' | 'open' | 'passed' | 'mastered'
type Unit = Pick<CurriculumUnit, 'id' | 'signs'>

/** Cancelled/unscorable takes must not be logged. Reject malformed log data,
 * but an actual scored zero still counts towards a practice goal. */
export function isScoredAttempt(entry: AttemptLogEntry): boolean {
  return Number.isFinite(entry.score) && entry.score >= 0 && entry.score <= 100
    && Number.isFinite(new Date(entry.createdAt).getTime())
    && (entry.stage === undefined || entry.stage === 'try' || entry.stage === 'recall' || entry.stage === 'sentence')
}

/** Best stars per gloss, across references. Recall needs an earlier two-star
 * Try; shuffled input cannot award a retrospective third star. Equal timestamps
 * do not prove that the two-star Try happened before the Recall. */
export function starsFor(gloss: string, attempts: readonly AttemptLogEntry[]): Stars {
  const own = attempts.filter((entry) => entry.gloss === gloss && isScoredAttempt(entry))
  let stars: Stars = 0
  let twoStarsAt = Infinity
  for (const entry of own) {
    if (entry.stage !== undefined && entry.stage !== 'try') continue
    if (entry.score >= TRY_SECOND_STAR) {
      stars = 2
      twoStarsAt = Math.min(twoStarsAt, new Date(entry.createdAt).getTime())
    } else if (entry.score >= TRY_FIRST_STAR && stars === 0) stars = 1
  }
  if (own.some((entry) => entry.stage === 'recall' && entry.revealed === false
      && entry.score >= RECALL_THIRD_STAR && new Date(entry.createdAt).getTime() > twoStarsAt)) return 3
  return stars
}

function passed(unit: Unit, attempts: readonly AttemptLogEntry[]): boolean {
  return unit.signs.length > 0 && unit.signs.every((gloss) => starsFor(gloss, attempts) >= UNIT_PASS_STARS)
}

/** Sequential path; free practice remains available outside this pure layer.
 * Empty units cannot pass/master or unlock their successor. */
export function unitState(unit: Unit, units: readonly Unit[], attempts: readonly AttemptLogEntry[]): UnitState {
  const index = units.findIndex((candidate) => candidate.id === unit.id)
  if (index < 0 || !units.slice(0, index).every((previous) => passed(previous, attempts))) return 'locked'
  if (!passed(unit, attempts)) return 'open'
  const isolated = attempts.filter((entry) => isScoredAttempt(entry) && entry.stage !== 'sentence')
  return unit.signs.every((gloss) => summarizeGloss(gloss, isolated).level === 'mastered') ? 'mastered' : 'passed'
}

/** One XP per best star per distinct gloss; repeats cannot farm XP. */
export function xp(attempts: readonly AttemptLogEntry[]): number {
  return [...new Set(attempts.map((entry) => entry.gloss))]
    .reduce((total, gloss) => total + starsFor(gloss, attempts), 0)
}

function validateDayInput(now: Date, target: number): void {
  if (!Number.isFinite(now.getTime())) throw new RangeError('Invalid goal date')
  if (!Number.isInteger(target) || target < 1) throw new RangeError('Goal must be a positive integer')
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

function countsByDay(attempts: readonly AttemptLogEntry[], now: Date): Map<string, number> {
  const counts = new Map<string, number>()
  const seen = new Set<string>()
  for (const entry of attempts) {
    if (!isScoredAttempt(entry) || seen.has(entry.id)) continue
    const date = new Date(entry.createdAt)
    if (date.getTime() > now.getTime()) continue
    seen.add(entry.id)
    const key = dayKey(date)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
}

export interface DailyGoal {
  count: number
  target: number
  remaining: number
  met: boolean
}

export function dailyGoal(attempts: readonly AttemptLogEntry[], now: Date = new Date(), target = DAILY_GOAL): DailyGoal {
  validateDayInput(now, target)
  const count = countsByDay(attempts, now).get(dayKey(now)) ?? 0
  return { count, target, remaining: Math.max(0, target - count), met: count >= target }
}

/** Consecutive local goal days, ending today or yesterday while today is still
 * unfinished. Calendar construction avoids 24-hour arithmetic across DST. */
export function streak(attempts: readonly AttemptLogEntry[], now: Date = new Date(), target = DAILY_GOAL): number {
  validateDayInput(now, target)
  const counts = countsByDay(attempts, now)
  let day = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const previousDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1)
  if ((counts.get(dayKey(day)) ?? 0) < target) day = previousDay(day)
  let length = 0
  while ((counts.get(dayKey(day)) ?? 0) >= target) {
    length++
    day = previousDay(day)
  }
  return length
}
