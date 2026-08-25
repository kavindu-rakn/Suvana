import { LATENCY_STORE, withStore } from '../storage/db'
import type { LatencySample } from './latency'

/**
 * Latency samples live in their own IndexedDB store rather than as extra fields
 * on the attempt log, for three reasons:
 *
 *  - the attempt log is a documented, deliberately slim record that mastery,
 *    the pilot export and the deferred error-mining work all read; performance
 *    fields do not belong in it;
 *  - latency is a property of the *system*, not of the learner;
 *  - a failed latency write must never be able to damage or block the attempt
 *    log, which is the one thing a pilot session cannot afford to lose.
 *
 * Samples are keyed by the attempt id, so the two join cleanly on export.
 */
export function addSample(sample: LatencySample): Promise<IDBValidKey> {
  return withStore(LATENCY_STORE, 'readwrite', (s) => s.put(sample))
}

/** All samples, oldest → newest. */
export async function listSamples(): Promise<LatencySample[]> {
  const all = await withStore(
    LATENCY_STORE,
    'readonly',
    (s) => s.getAll() as IDBRequest<LatencySample[]>,
  )
  return all.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}
