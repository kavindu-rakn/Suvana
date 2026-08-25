import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { buildSample } from './latency'
import type { LatencyMarks, LatencySource, SampleMeta } from './latency'
import { addSample } from './latencyStore'

/** The marks a view can take itself; `paintAt` is this hook's job. */
export type ArmedMarks = Omit<LatencyMarks, 'paintAt'>
type ArmedMeta = Omit<SampleMeta, 'source'>

/**
 * Takes the "feedback is on screen" mark and persists the finished sample.
 *
 * A view calls `arm()` in the same synchronous block as the state updates that
 * show the result. Getting the paint mark right needs both of the following,
 * and neither is interchangeable with the obvious alternative:
 *
 *  - **`useLayoutEffect`, not `useEffect`.** Layout effects run right after
 *    React mutates the DOM and *before* the browser paints. Passive effects may
 *    already be deferred past the paint, which would silently add a frame or
 *    two to every measurement.
 *  - **Two nested `requestAnimationFrame`s.** Within a frame, rAF callbacks run
 *    *before* style/layout/paint, so the first one is still ahead of the pixels
 *    appearing. The second fires at the start of the following frame — after
 *    the feedback has been painted. Its timestamp is therefore the first
 *    instant we can honestly say the learner could see the feedback, and it
 *    overshoots by at most one frame interval.
 *
 * Samples taken while the tab is in the background are discarded: rAF is
 * throttled or paused there, so the number would measure the tab being hidden
 * rather than the app being slow. A participant would have to switch away and
 * back inside two frames to defeat that check.
 *
 * `onSampled` fires immediately after the sample is taken — the frame after
 * `paintAt`. It exists so a view can start a celebratory reveal that provably
 * cannot enter the measurement: the score is committed in its final, legible
 * form for the frame being timed, and only then does anything move. Without
 * that split, an entrance animation attached to the result commit would add
 * style recalc and a composited layer to precisely the frame under the stopwatch,
 * and inflate a figure the report quotes against a ≤300 ms target.
 *
 * It fires whether or not a sample was stored, because the reveal is
 * presentation and must not depend on measurement succeeding.
 */
export function useFeedbackLatency(source: LatencySource, onSampled?: () => void) {
  const armedRef = useRef<{ marks: ArmedMarks; meta: ArmedMeta; measure: boolean } | null>(null)
  const rafRef = useRef(0)
  // Read through a ref so a caller can pass an inline arrow without this hook
  // needing to re-memoise, and without a stale closure at fire time.
  const onSampledRef = useRef(onSampled)
  onSampledRef.current = onSampled

  const arm = useCallback((marks: ArmedMarks, meta: ArmedMeta) => {
    // A hidden tab still arms — the reveal is released either way — but its
    // timing is not recorded.
    armedRef.current = { marks, meta, measure: !document.hidden }
  }, [])

  // Deliberately no dependency array: this has to run after whichever commit
  // rendered the feedback, and the view owns that state, not this hook. The
  // body is a ref check, so running it after every commit costs nothing.
  useLayoutEffect(() => {
    const armed = armedRef.current
    if (!armed) return
    armedRef.current = null
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = requestAnimationFrame((paintAt) => {
        if (armed.measure && !document.hidden) {
          const sample = buildSample({ ...armed.marks, paintAt }, { ...armed.meta, source })
          addSample(sample).catch((e: unknown) =>
            // Losing a latency sample costs a data point, never the attempt
            // itself, so this stays a console warning rather than learner-facing.
            console.error('Failed to save the latency sample', e),
          )
        }
        // Strictly after the measurement: this is what releases the reveal.
        onSampledRef.current?.()
      })
    })
  })

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  // Stable identity, so callers can list this in a dependency array without
  // re-memoising their capture callback on every render.
  return useMemo(() => ({ arm }), [arm])
}
