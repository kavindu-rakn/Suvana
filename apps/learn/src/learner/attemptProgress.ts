import type { ScoreResult } from '../scoring/score'
import type { AttemptLogEntry } from './attemptLog'

/**
 * Whether a scored take belongs in the attempt log.
 *
 * Not when no hand was compared: a reference with no tracked hands scores an
 * empty `hands` list (a 0 that measures nothing), and a take where every hand
 * is missing means the tracker never saw the learner. Logging either would
 * drag mastery down for something the learner did not do.
 */
export function shouldLogAttempt(result: ScoreResult): boolean {
  return result.hands.length > 0 && !result.hands.every((h) => h.missing)
}

export interface AttemptProgress {
  /** Change from the previous logged attempt at this sign; null if none. */
  delta: number | null
  /** True when this score beats every earlier attempt at this sign. */
  best: boolean
}

/**
 * Compare a take with the earlier attempts at the same sign.
 *
 * Earlier attempts are every logged entry for the gloss except the take itself,
 * found by id. Slicing off the last entry instead would drop a real attempt
 * whenever the current take was not logged.
 */
export function progressAgainstEarlier(
  entries: readonly AttemptLogEntry[],
  gloss: string,
  attemptId: string,
  score: number,
): AttemptProgress {
  const earlier = entries.filter((e) => e.gloss === gloss && e.id !== attemptId)
  if (earlier.length === 0) return { delta: null, best: false }
  const previous = earlier[earlier.length - 1].score
  const bestBefore = Math.max(...earlier.map((e) => e.score))
  return { delta: score - previous, best: score > bestBefore }
}
