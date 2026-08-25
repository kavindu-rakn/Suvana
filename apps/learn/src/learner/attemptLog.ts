import type { Finger } from '../scoring/landmarks'
import { ATTEMPTS_STORE, withStore } from '../storage/db'

/**
 * One scored practice attempt. Deliberately slim — no landmark frames — so
 * thousands of attempts stay cheap to store and query. `worstFingers` keeps
 * the per-attempt error signature; the deferred error-mining work
 * (K-means/PrefixSpan, Sep–Oct) will consume exactly this log.
 */
export interface AttemptLogEntry {
  id: string
  gloss: string
  /** Which reference recording the attempt was scored against. */
  referenceId: string
  /** Overall DTW match score, 0–100. */
  score: number
  /** Fingers most deviant in this attempt, worst first (may be empty). */
  worstFingers: Finger[]
  /**
   * The practice session this attempt belonged to, if any. Absent for free
   * practice and for scenario turns — both are still practice, they just are
   * not a numbered session. Segmenting by this is what makes "learning gain
   * after N sessions" a countable claim rather than one inferred from clock gaps.
   */
  sessionId?: string
  createdAt: string
}

export function addAttempt(entry: AttemptLogEntry): Promise<IDBValidKey> {
  return withStore(ATTEMPTS_STORE, 'readwrite', (s) => s.put(entry))
}

/** All attempts, oldest → newest (the order the mastery model consumes). */
export async function listAttempts(): Promise<AttemptLogEntry[]> {
  const all = await withStore(
    ATTEMPTS_STORE,
    'readonly',
    (s) => s.getAll() as IDBRequest<AttemptLogEntry[]>,
  )
  return all.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}
