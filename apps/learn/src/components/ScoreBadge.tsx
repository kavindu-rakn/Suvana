import { band } from '../scoring/band'

/** One scored hand: its measured match score, or that it was not seen. */
export interface HandFeedback {
  handedness: 'Left' | 'Right'
  score: number
  missing?: boolean
}

interface ScoreBadgeProps {
  score: number
  /** Change against previous attempt */
  delta?: number | null
  /** True when attempt beats all earlier attempts */
  best?: boolean
  /** Hide delta line */
  hideDelta?: boolean
  /**
   * Measured per-hand scores. Shown only for a two-handed sign (with one hand
   * the hand score is the overall score). Omit it and no hand row is shown.
   *
   * There are deliberately no per-finger states here: fixed cut-offs on the
   * per-finger deviation could not tell a correct take from a wrong sign
   * (fingerStates.ts; kvn 13 Oct), so nothing per finger is shown.
   */
  hands?: HandFeedback[]
}

/**
 * Circular progress ring showing the 0–100 match score, its band label, and
 * the per-hand scores of a two-handed sign.
 */
export function ScoreBadge({
  score,
  delta = null,
  best = false,
  hideDelta = false,
  hands = [],
}: ScoreBadgeProps) {
  const r = 54
  const c = 2 * Math.PI * r
  const offset = c * (1 - Math.max(0, Math.min(100, score)) / 100)
  const { klass, label } = band(score)

  return (
    <div className={`score-badge aww-score-badge ${klass}`}>
      {/* Top Match Dial */}
      <div className="aww-score-dial-wrap">
        <svg viewBox="0 0 130 130" width="144" height="144" className="aww-score-svg">
          <circle cx="65" cy="65" r={r} className="ring-track" />
          <circle
            cx="65"
            cy="65"
            r={r}
            className="ring-value"
            strokeDasharray={c}
            style={
              {
                '--ring-empty': c,
                '--ring-offset': offset,
              } as React.CSSProperties
            }
            strokeDashoffset={offset}
            transform="rotate(-90 65 65)"
          />
          <text x="65" y="60" className="ring-score" dominantBaseline="central" textAnchor="middle">
            {score}
          </text>
          <text x="65" y="80" className="ring-sublabel" dominantBaseline="central" textAnchor="middle">
            MATCH
          </text>
        </svg>
      </div>

      <div className="aww-score-header-group">
        <span className="score-label aww-score-label">{label}</span>
      </div>

      {best && <span className="score-best aww-score-best">★ New Personal Best!</span>}

      {!hideDelta && (
        <span className="score-delta aww-score-delta">
          {delta === null
            ? 'First recorded attempt at this sign'
            : delta === 0
              ? 'Matched your previous benchmark'
              : delta > 0
                ? `+${delta} improvement from last take`
                : `${delta} delta from last take`}
        </span>
      )}

      {/* Per-hand scores of a two-handed sign, from the scorer */}
      {hands.length > 1 && (
        <div className="aww-anatomical-hand-section">
          <div className="aww-hand-section-title">
            <span>Each hand</span>
            <span className="aww-hand-mode-tag">Two-Handed Sign</span>
          </div>

          <div className="aww-hands-layout dual-hands">
            {hands.map((h) => (
              <div key={h.handedness} className={`aww-hand-widget ${h.missing ? 'is-missing' : ''}`}>
                <div className="aww-hand-widget-header">
                  <span className="aww-hand-name">{h.handedness} hand</span>
                  <span className={`aww-hand-score ${h.missing ? 'score-missing' : ''}`}>
                    {h.missing ? 'Not seen' : h.score}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
