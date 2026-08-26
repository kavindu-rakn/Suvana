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

// BASE_URL-relative: this module is served under /learn/ (see vite.config.ts).
const INDEX_URL = `${import.meta.env.BASE_URL}reference-index.json`

// Module-level, so the four views share one request no matter how many mount
// concurrently or how often the learner switches tabs.
let indexPromise: Promise<RecordingMeta[]> | null = null

/**
 * The on-disk index shape. Provenance fields that are constant within a corpus
 * live once in `sources` rather than on all 501 recordings — see
 * scripts/build-reference-index.mjs. Version 1 was a bare array.
 */
interface PackedIndex {
  version: number
  sources: Record<string, Partial<RecordingMeta>>
  recordings: RecordingMeta[]
}

/**
 * Put the hoisted provenance fields back on each recording.
 *
 * The entry is spread last so an inline value always beats the source default.
 * That is what makes the build script's hoist safe: it only lifts a field when
 * every entry agrees, and anything that disagrees stays inline and wins here.
 */
function unpack(raw: PackedIndex | RecordingMeta[]): RecordingMeta[] {
  // Version 1 shipped a bare array. Tolerated so a stale cached index — or a
  // hand-built one — does not blank the corpus.
  if (Array.isArray(raw)) return raw
  const sources = raw.sources ?? {}
  return (raw.recordings ?? []).map((rec) => {
    const shared = rec.source ? sources[rec.source] : undefined
    return shared ? { ...shared, ...rec } : rec
  })
}

/** Metadata for every bundled reference. Fetched once per page load. */
export function loadReferenceIndex(): Promise<RecordingMeta[]> {
  indexPromise ??= fetch(INDEX_URL)
    .then((r) => {
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`)
      return r.json().then(unpack) as Promise<RecordingMeta[]>
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

  const pending = fetch(`${import.meta.env.BASE_URL}references/${file}`)
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
