import { ATTEMPTS_STORE, getActiveProfile, profileDatabaseName, withStore } from './db'
import type { ProgressProfile } from './db'

// db.ts owns namespace selection, so opening a store and selecting a profile
// share one source of truth without a circular module dependency.
export { getActiveProfile, setActiveProfile, profileDatabaseName, PROFILE_STORAGE_KEY } from './db'
export type { ProgressProfile } from './db'

/** Mastery, stars, goals and streak are derived from attempts; clearing that
 * store resets progress without deleting references or latency measurements.
 * Capture the requested profile before awaiting, even if the UI switches
 * while this reset is pending.
 */
export async function resetProgress(profile: ProgressProfile = getActiveProfile()): Promise<void> {
  profileDatabaseName(profile) // Validate even for untyped callers, before opening storage.
  await withStore(ATTEMPTS_STORE, 'readwrite', (store) => store.clear(), profile)
}
