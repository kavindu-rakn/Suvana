import type { HandFrame } from '../vision/types'

export interface ReplayStep { referenceIndex: number; attemptIndex: number; timeMs: number }
/** L-18 pairs index original frames. Keep their monotonic order, never
 * interpolate a pose across missing tracking or invent a replacement path. */
export function buildReplayPlan(reference: HandFrame[], attempt: HandFrame[], alignment: Array<[number, number]> = []): ReplayStep[] {
  const steps: ReplayStep[] = []
  for (const [ri, ai] of alignment) {
    if (!Number.isInteger(ri) || !Number.isInteger(ai) || ri < 0 || ai < 0
      || ri >= reference.length || ai >= attempt.length) continue
    const previous = steps.at(-1)
    if (previous && (ri < previous.referenceIndex || ai < previous.attemptIndex
      || (ri === previous.referenceIndex && ai === previous.attemptIndex))) continue
    const rt = reference[ri].timestampMs, at = attempt[ai].timestampMs
    if (!Number.isFinite(rt) || !Number.isFinite(at)) continue
    // Each warped step waits for the larger recorded interval. Repeated
    // indices hold that side still; clock speed is a display choice only.
    const delta = previous ? Math.max(0, rt - reference[previous.referenceIndex].timestampMs,
      at - attempt[previous.attemptIndex].timestampMs) : 0
    steps.push({ referenceIndex: ri, attemptIndex: ai, timeMs: (previous?.timeMs ?? 0) + delta })
  }
  return steps
}

export function replayStepAt(steps: ReplayStep[], timeMs: number): number {
  let low = 0, high = Math.max(0, steps.length - 1)
  while (low < high) {
    const mid = Math.ceil((low + high) / 2)
    if (steps[mid].timeMs <= timeMs) low = mid
    else high = mid - 1
  }
  return low
}

/** First exported pairing for the scorer's original attempt-frame index. */
export function replayFocusStep(steps: ReplayStep[], worstFrameIndex?: number): number {
  return steps.findIndex(step => step.attemptIndex === worstFrameIndex)
}
