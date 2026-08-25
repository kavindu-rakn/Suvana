/**
 * Fields the selection rule needs. Declared structurally rather than as
 * `RecordingMeta` so these functions work on anything carrying them — the
 * bundled index, a locally-recorded sign described by `toMeta`, or a richer
 * object a caller wants back unchanged (hence the generic).
 */
interface Pickable {
  gloss: string
  provisional?: boolean
  createdAt: string
  durationMs: number
  frameCount: number
}

/**
 * Choose one reference per gloss from every recording available.
 *
 * Ordering rule: an authoritative reference always beats a provisional one for
 * the same gloss, so dropping a real dataset (or School-for-the-Deaf) recording
 * in place of a team stand-in takes effect immediately, without anyone having
 * to delete the stand-in. Among equals, the newest wins.
 */
export function pickReferences<T extends Pickable>(recordings: T[]): Map<string, T> {
  const byGloss = new Map<string, T>()
  for (const rec of recordings) {
    const incumbent = byGloss.get(rec.gloss)
    if (!incumbent || beats(rec, incumbent)) byGloss.set(rec.gloss, rec)
  }
  return byGloss
}

/**
 * Effective capture rate. Corpora differ: one of ours samples at ~25 fps and
 * another at ~10 fps for the same sign, and the finer sampling gives DTW more
 * to align against.
 *
 * Uses `frameCount` rather than `frames.length` so the rule can run against the
 * bundled index, before any frames have been downloaded.
 */
function captureRate(rec: Pickable): number {
  if (rec.durationMs <= 0 || rec.frameCount === 0) return 0
  return (rec.frameCount / rec.durationMs) * 1000
}

function beats(candidate: Pickable, incumbent: Pickable): boolean {
  // 1. Authoritative always beats a provisional team stand-in.
  const candidateProvisional = candidate.provisional === true
  const incumbentProvisional = incumbent.provisional === true
  if (candidateProvisional !== incumbentProvisional) return incumbentProvisional

  // 2. Between two authoritative references for the same sign, prefer the one
  //    with finer temporal sampling. Without this the winner would just be
  //    whichever corpus was converted last, which is not a reason.
  const rateDelta = captureRate(candidate) - captureRate(incumbent)
  if (Math.abs(rateDelta) > 1) return rateDelta > 0

  // 3. Otherwise the newer recording.
  return candidate.createdAt > incumbent.createdAt
}

/** Same selection, as a list sorted by gloss — for chip lists and pickers. */
export function pickReferenceList<T extends Pickable>(recordings: T[]): T[] {
  return [...pickReferences(recordings).values()].sort((a, b) => a.gloss.localeCompare(b.gloss))
}
