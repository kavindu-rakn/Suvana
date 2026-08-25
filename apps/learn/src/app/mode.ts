/**
 * Learner mode vs author/researcher mode.
 *
 * The five tabs were never peers. Record writes ground-truth references with a
 * provenance field; Library exports JSON with instructions to commit the files
 * to the repo. A hearing learner in the pilot was being shown, as equal-weight
 * choices, two tools whose success criterion is a git commit — and a Study tab
 * whose export exists for the researcher, not for them.
 *
 * Entry is `?mode=author` (what a pilot facilitator bookmarks) or a quiet
 * footer link (what a demo uses). Deliberately not a long-press or a secret
 * gesture: those are invisible to keyboard and screen-reader users, and they
 * are exactly the sort of thing that cannot be found on a projector during a
 * viva.
 */
export type AppMode = 'learner' | 'author'

const KEY = 'ssl-learn-mode'

/** Mode for this session: URL parameter wins, then the stored preference. */
export function readMode(): AppMode {
  try {
    const param = new URLSearchParams(window.location.search).get('mode')
    if (param === 'author') {
      persistMode('author')
      return 'author'
    }
    if (param === 'learner') {
      persistMode('learner')
      return 'learner'
    }
    return window.localStorage.getItem(KEY) === 'author' ? 'author' : 'learner'
  } catch {
    // Private browsing can throw on storage access; a learner view is the safe
    // default, since it only ever hides tools rather than exposing them.
    return 'learner'
  }
}

export function persistMode(mode: AppMode): void {
  try {
    if (mode === 'author') window.localStorage.setItem(KEY, 'author')
    else window.localStorage.removeItem(KEY)
  } catch {
    /* storage unavailable — mode simply does not persist across reloads */
  }
}
