import { LATENCY_TARGET_MS, summarizeLatency } from '../metrics/latency'
import type { LatencySample } from '../metrics/latency'

/**
 * Below this, the sample is too small to say anything about the tail — a p95
 * over 12 attempts is just "the second slowest one". The panel still shows the
 * numbers, but labels them as provisional rather than letting a lucky handful
 * of fast attempts read as the target being met.
 */
const ENOUGH_SAMPLES = 20

function ms(value: number): string {
  return `${Math.round(value)} ms`
}

/**
 * Measured feedback latency against the proposal's ≤300 ms target.
 *
 * This is the reporting surface for the one proposal target the app can
 * measure entirely on its own — no expert grader, no pre/post test. Everything
 * here comes from real attempts on the machine it is being read on.
 */
export function LatencyPanel({ samples }: { samples: LatencySample[] }) {
  const summary = summarizeLatency(samples)

  if (!summary) {
    return (
      <div className="latency-panel">
        <div className="latency-head">
          <h3>Feedback latency</h3>
          <span className="latency-target">target ≤{LATENCY_TARGET_MS} ms</span>
        </div>
        <p className="empty-state">
          Not measured yet. Every scored attempt in <strong>Practice</strong> or{' '}
          <strong>Scenario</strong> times itself, so this fills in as you use the app.
        </p>
      </div>
    )
  }

  const met = summary.withinTargetPct === 100
  const provisional = summary.n < ENOUGH_SAMPLES

  return (
    <div className="latency-panel">
      <div className="latency-head">
        <h3>Feedback latency</h3>
        <span className="latency-target">
          {summary.n} attempt{summary.n === 1 ? '' : 's'} · target ≤{LATENCY_TARGET_MS} ms
        </span>
      </div>

      <div className="stat-tiles">
        <div className="stat-tile">
          <span className="stat-value">{ms(summary.total.medianMs)}</span>
          <span className="stat-label">median</span>
        </div>
        <div className="stat-tile">
          <span className="stat-value">{ms(summary.total.p95Ms)}</span>
          <span className="stat-label">95th percentile</span>
        </div>
        <div className="stat-tile">
          <span className={met ? 'stat-value good' : 'stat-value'}>
            {Math.round(summary.withinTargetPct)}%
          </span>
          <span className="stat-label">within {LATENCY_TARGET_MS} ms</span>
        </div>
        <div className="stat-tile">
          <span className="stat-value">{ms(summary.total.maxMs)}</span>
          <span className="stat-label">slowest</span>
        </div>
      </div>

      <ul className="latency-stages">
        <li>
          <span className="latency-stage-name">Hand tracking</span>
          <span className="latency-stage-value">{ms(summary.tracking.medianMs)}</span>
        </li>
        <li>
          <span className="latency-stage-name">Sign scoring</span>
          <span className="latency-stage-value">{ms(summary.scoring.medianMs)}</span>
        </li>
        <li>
          <span className="latency-stage-name">Showing feedback</span>
          <span className="latency-stage-value">{ms(summary.render.medianMs)}</span>
        </li>
      </ul>

      <p className="hint-text">
        Measured from the last frame of your sign to the feedback appearing on screen — median
        stage times shown. Camera and display hardware delay sit outside the browser and are not
        included.
        {provisional && (
          <>
            {' '}
            <strong>Provisional:</strong> {summary.n} attempts is too few to characterise the
            slowest cases; {ENOUGH_SAMPLES}+ gives a meaningful 95th percentile.
          </>
        )}
      </p>
    </div>
  )
}
