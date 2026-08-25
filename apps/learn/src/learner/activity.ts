import type { AttemptLogEntry } from './attemptLog'

/**
 * Practice over time, derived from the attempt log.
 *
 * Mastery answers "how well do I sign this"; nothing answered "am I actually
 * turning up". For a module whose research target is a learning gain measured
 * across sessions, consistency is the other half of the story, and it is the
 * half a learner can act on directly.
 *
 * Everything here works in the learner's LOCAL day. An attempt at 23:50 and
 * one at 00:10 are two days of practice to the person who made them, whatever
 * UTC thinks, so `createdAt` is parsed and then read through local getters
 * rather than sliced off the ISO string.
 */

export interface DayBucket {
  /** Local date key, YYYY-MM-DD. Stable to sort and to use as a React key. */
  date: string
  attempts: number
  /** Mean score that day, or null on a day with no practice. */
  avgScore: number | null
}

/** Local-date key for a Date, as YYYY-MM-DD. */
export function dayKey(d: Date): string {
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/**
 * One bucket per day for the last `days` days, oldest first, including days
 * with no practice — the gaps are the point of the chart.
 */
export function dailyActivity(
  entries: AttemptLogEntry[],
  days: number,
  now: Date = new Date(),
): DayBucket[] {
  const totals = new Map<string, { n: number; sum: number }>()
  for (const e of entries) {
    const key = dayKey(new Date(e.createdAt))
    const cur = totals.get(key) ?? { n: 0, sum: 0 }
    cur.n += 1
    cur.sum += e.score
    totals.set(key, cur)
  }

  const today = startOfLocalDay(now)
  const out: DayBucket[] = []
  for (let i = days - 1; i >= 0; i--) {
    // Constructed by date arithmetic rather than by subtracting milliseconds,
    // so a DST change cannot shift a bucket onto the wrong day.
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i)
    const key = dayKey(d)
    const hit = totals.get(key)
    out.push({
      date: key,
      attempts: hit?.n ?? 0,
      avgScore: hit ? Math.round(hit.sum / hit.n) : null,
    })
  }
  return out
}

/**
 * Consecutive local days of practice, ending today or yesterday.
 *
 * Yesterday counts as the end of a live streak on purpose: a learner who
 * practised yesterday and has not opened the app yet today has not broken
 * anything, and showing 0 until their first attempt would punish them for the
 * time of day they happened to look. It only resets once a whole day is
 * missed.
 */
export function currentStreak(entries: AttemptLogEntry[], now: Date = new Date()): number {
  if (entries.length === 0) return 0
  const practised = new Set(entries.map((e) => dayKey(new Date(e.createdAt))))
  const today = startOfLocalDay(now)

  const dayAt = (offset: number) =>
    dayKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset))

  // Where the streak is allowed to end: today, or yesterday if nothing today.
  let offset = practised.has(dayAt(0)) ? 0 : practised.has(dayAt(1)) ? 1 : -1
  if (offset === -1) return 0

  let streak = 0
  while (practised.has(dayAt(offset))) {
    streak += 1
    offset += 1
  }
  return streak
}
