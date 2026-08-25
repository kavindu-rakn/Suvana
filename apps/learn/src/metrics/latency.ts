/**
 * Feedback-latency instrumentation.
 *
 * The proposal commits to **≤300 ms feedback latency**. Until now only the
 * component costs were known (per-frame inference from the tracking hook, ~6 ms
 * per DTW score from the bench), which is not the same claim: it leaves out
 * React's commit, the browser's paint, and the fact that a scenario turn scores
 * the attempt several times over. This module measures the whole path in the
 * real app, on real attempts, so the target can be reported as a measurement
 * rather than an estimate.
 *
 * ## What "feedback latency" means here
 *
 * The clock starts at the **capture of the final frame of the attempt** — the
 * earliest instant the system could possibly know the sign was finished — and
 * stops when the **corrective feedback has been painted** on screen.
 *
 *   final frame captured
 *     └─ trackingMs  landmark inference on that frame, overlay draw, hand-off
 *     └─ scoringMs   DTW scoring (in a scenario turn, also the rubric's
 *                    appropriateness pass over the scenario vocabulary)
 *     └─ renderMs    React commit + browser paint of the score and hints
 *   feedback visible
 *
 * **Excluded, and not measurable from JavaScript:** the camera's own
 * sensor→browser delay before the frame reaches us, and the display's
 * pixel-response time after we paint. Both are properties of the participant's
 * hardware rather than of this module. Every figure here is therefore a
 * *software pipeline* latency, and should be quoted as such.
 *
 * The measurement errs high in two places, which is the safe direction for a
 * claim of "under X ms":
 *  - the final frame is whichever frame ended the take, so up to one frame
 *    interval (~33 ms at 30 fps) of waiting is charged to us;
 *  - the paint mark is taken at the frame boundary *after* the paint (see
 *    `useFeedbackLatency`), so up to one more frame interval is included.
 */

/** The proposal's commitment, and the line drawn in the Progress dashboard. */
export const LATENCY_TARGET_MS = 300

/** Which surface produced the sample — the two differ in scoring cost. */
export type LatencySource = 'practice' | 'scenario'

/**
 * Raw clock marks along the feedback path. All are `performance.now()` values
 * on the same monotonic clock, so differences are meaningful even if the wall
 * clock changes mid-session.
 */
export interface LatencyMarks {
  /** Taken immediately before landmark inference on the take's final frame. */
  captureAt: number
  scoreStartAt: number
  scoreEndAt: number
  /** First frame boundary after the feedback was painted. */
  paintAt: number
}

export interface LatencySample {
  /** The id of the attempt this measures — the join key into the attempt log. */
  id: string
  source: LatencySource
  gloss: string
  /** Final-frame landmark inference, overlay draw, and hand-off to scoring. */
  trackingMs: number
  /** DTW scoring, including any rubric competitors. */
  scoringMs: number
  /** React commit + browser paint of the feedback. */
  renderMs: number
  /** Final frame captured → feedback painted. The ≤300 ms figure. */
  totalMs: number
  /** Frames in the scored take — the main driver of scoring cost (DTW is O(n·m)). */
  frameCount: number
  createdAt: string
}

export interface SampleMeta {
  id: string
  source: LatencySource
  gloss: string
  frameCount: number
  createdAt: string
}

/** performance.now() is sub-microsecond in principle and coarsened in practice;
 *  0.1 ms is well below anything that matters at a 300 ms budget. */
function round(ms: number): number {
  return Math.round(ms * 10) / 10
}

export function buildSample(marks: LatencyMarks, meta: SampleMeta): LatencySample {
  return {
    ...meta,
    trackingMs: round(marks.scoreStartAt - marks.captureAt),
    scoringMs: round(marks.scoreEndAt - marks.scoreStartAt),
    renderMs: round(marks.paintAt - marks.scoreEndAt),
    totalMs: round(marks.paintAt - marks.captureAt),
  }
}

/**
 * Nearest-rank percentile over an ascending-sorted array, `p` in 0–100.
 *
 * Same convention as `scoring/calibration.test.ts`, so every percentile the
 * project reports is computed the same way. It always returns an observed
 * value rather than interpolating between two, which keeps "p95 = 214 ms"
 * literally true of some attempt that happened.
 */
export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return NaN
  const i = Math.min(sorted.length - 1, Math.max(0, Math.round((p / 100) * (sorted.length - 1))))
  return sorted[i]
}

export interface StageSummary {
  medianMs: number
  p95Ms: number
  maxMs: number
}

export interface LatencySummary {
  n: number
  targetMs: number
  /** Final frame captured → feedback painted. */
  total: StageSummary & { meanMs: number }
  tracking: StageSummary
  scoring: StageSummary
  render: StageSummary
  /** Share of attempts (0–100) whose feedback landed inside the target. */
  withinTargetPct: number
  /** Per-surface counts — scenario turns cost more than practice attempts. */
  bySource: Record<LatencySource, number>
}

function summarizeStage(values: number[]): StageSummary {
  const sorted = [...values].sort((a, b) => a - b)
  return {
    medianMs: round(percentile(sorted, 50)),
    p95Ms: round(percentile(sorted, 95)),
    maxMs: round(sorted[sorted.length - 1]),
  }
}

/** Null for an empty set — an unmeasured target must not read as a passing 0. */
export function summarizeLatency(
  samples: LatencySample[],
  targetMs: number = LATENCY_TARGET_MS,
): LatencySummary | null {
  if (samples.length === 0) return null

  const totals = samples.map((s) => s.totalMs)
  const withinTarget = totals.filter((ms) => ms <= targetMs).length

  return {
    n: samples.length,
    targetMs,
    total: {
      ...summarizeStage(totals),
      meanMs: round(totals.reduce((a, b) => a + b, 0) / totals.length),
    },
    tracking: summarizeStage(samples.map((s) => s.trackingMs)),
    scoring: summarizeStage(samples.map((s) => s.scoringMs)),
    render: summarizeStage(samples.map((s) => s.renderMs)),
    withinTargetPct: round((withinTarget / samples.length) * 100),
    bySource: {
      practice: samples.filter((s) => s.source === 'practice').length,
      scenario: samples.filter((s) => s.source === 'scenario').length,
    },
  }
}
