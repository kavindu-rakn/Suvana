interface ScoreBadgeProps {
  score: number
}

function band(score: number): { klass: string; label: string } {
  if (score >= 85) return { klass: 'good', label: 'Great match' }
  if (score >= 60) return { klass: 'ok', label: 'Getting there' }
  return { klass: 'low', label: 'Keep practising' }
}

/**
 * Circular progress ring showing a 0–100 sign-match score.
 *
 * The numeral is rendered at its final value immediately — it is the actual
 * feedback, and the ≤300 ms latency figure is only honest if the score is
 * readable on the frame that gets measured. The ring is a redundant encoding of
 * the same number, so it is the part allowed to animate; it sweeps once the
 * reveal is armed (see useFeedbackLatency's onSampled), and simply renders full
 * when it is not, which is also what happens under reduced motion.
 */
export function ScoreBadge({ score }: ScoreBadgeProps) {
  const r = 52
  const c = 2 * Math.PI * r
  const offset = c * (1 - Math.max(0, Math.min(100, score)) / 100)
  const { klass, label } = band(score)

  return (
    <div className={`score-badge ${klass}`}>
      <svg viewBox="0 0 120 120" width="120" height="120">
        <circle cx="60" cy="60" r={r} className="ring-track" />
        <circle
          cx="60"
          cy="60"
          r={r}
          className="ring-value"
          strokeDasharray={c}
          // Both ends of the sweep, handed to CSS so the keyframe can run
          // entirely on the compositor without React re-rendering per frame.
          style={
            {
              '--ring-empty': c,
              '--ring-offset': offset,
            } as React.CSSProperties
          }
          strokeDashoffset={offset}
          transform="rotate(-90 60 60)"
        />
        <text x="60" y="60" className="ring-score" dominantBaseline="central" textAnchor="middle">
          {score}
        </text>
      </svg>
      <span className="score-label">{label}</span>
    </div>
  )
}
