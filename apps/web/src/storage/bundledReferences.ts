import type { RecordingMeta, SignRecording } from '../vision/types'

/**
 * Bundled reference recordings ship with the app in public/references/.
 *
 * They are loaded in two halves. `loadReferenceIndex` fetches one ~220 KB file
 * describing all 362 recordings; `loadReferenceFrames` fetches the landmark
 * frames for a single sign, on demand. Previously every view fetched all 362
 * files — 18.5 MB — on mount, four times over, with no cache, so each tab
 * switch re-downloaded and re-parsed the entire corpus.
 *
 * Team workflow is unchanged: record in the Record tab → Export JSON → commit
 * the file to public/references/ and list it in manifest.json. The index is
 * rebuilt from the manifest by scripts/build-reference-index.mjs on predev,
 * prebuild and pretest.
 */

const INDEX_URL = '/reference-index.json'

// Module-level, so the four views share one request no matter how many mount
// concurrently or how often the learner switches tabs.
let indexPromise: Promise<RecordingMeta[]> | null = null

/** Metadata for every bundled reference. Fetched once per page load. */
export function loadReferenceIndex(): Promise<RecordingMeta[]> {
  indexPromise ??= fetch(INDEX_URL)
    .then((r) => {
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`)
      return r.json() as Promise<RecordingMeta[]>
    })
    .catch((e: unknown) => {
      // Allow a retry: a transient failure should not leave the app with an
      // empty corpus for the rest of the session.
      indexPromise = null
      console.error('Could not load the reference index', e)
      return [] as RecordingMeta[]
    })
  return indexPromise
}

/**
 * Frames are held in a small LRU. The cap matters: a learner browsing the
 * library could otherwise pull the whole 18.5 MB corpus into memory one row at
 * a time, which is the problem this module exists to solve. 24 recordings is
 * roughly 1 MB of parsed frames at the corpus's 40-frame average, and comfortably
 * covers a practice session plus a scenario's vocabulary.
 */
const FRAME_CACHE_MAX = 24
const frameCache = new Map<string, Promise<SignRecording | null>>()

/** Full recording, frames included, for one bundled reference file. */
export function loadReferenceFrames(file: string): Promise<SignRecording | null> {
  const cached = frameCache.get(file)
  if (cached) {
    // Re-insert to mark as most recently used (Map iterates in insertion order).
    frameCache.delete(file)
    frameCache.set(file, cached)
    return cached
  }

  const pending = fetch(`/references/${file}`)
    .then((r) => (r.ok ? (r.json() as Promise<SignRecording>) : null))
    .catch(() => null)

  // Don't cache a failure permanently — drop it so a later attempt refetches.
  void pending.then((rec) => {
    if (rec === null) frameCache.delete(file)
  })

  frameCache.set(file, pending)
  while (frameCache.size > FRAME_CACHE_MAX) {
    const oldest = frameCache.keys().next().value
    if (oldest === undefined) break
    frameCache.delete(oldest)
  }
  return pending
}

/** Frames for several references at once — a scenario's vocabulary, say. */
export function loadReferenceFramesMany(files: string[]): Promise<SignRecording[]> {
  return Promise.all(files.map(loadReferenceFrames)).then((recs) =>
    recs.filter((r): r is SignRecording => r !== null),
  )
}
