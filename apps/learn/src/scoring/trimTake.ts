import type { HandFrame } from '../vision/types'

/**
 * Trim a learner's take to its tracked span, the same way references are
 * trimmed when they are built.
 *
 * tools/reference-converter/convert_references.py (the "Trim to the tracked
 * span" block after decoding) drops every leading and trailing frame with no
 * hand, then shifts timestamps so the first kept frame is at 0. References are
 * therefore sign-to-sign; without the same trim, the hands-down frames at the
 * start and end of a learner's capture window would be aligned against the
 * sign and pull the score down for waiting, not for signing.
 *
 * Gaps inside the span are kept, as the converter keeps them. A take with no
 * hand at all returns [] (the converter rejects such a clip outright).
 */
export function trimTake(frames: readonly HandFrame[]): HandFrame[] {
  const first = frames.findIndex((f) => f.hands.length > 0)
  if (first === -1) return []
  let last = frames.length - 1
  while (frames[last].hands.length === 0) last--
  const origin = frames[first].timestampMs
  return frames
    .slice(first, last + 1)
    .map((f) => ({ ...f, timestampMs: f.timestampMs - origin }))
}
