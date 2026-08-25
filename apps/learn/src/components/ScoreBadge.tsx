interface ScoreBadgeProps {
  score: number
  /**
   * Change against the learner's previous attempt at this same sign, or null
   * when this is the first one. Zero is meaningful and distinct from null.
   */
  delta?: number | null
  /** True when this attempt beats every earlier attempt at this sign. */
  best?: boolean
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
 *
 * The same rule governs the delta line below it: it is information, so it is
 * printed final and unanimated. A drop is styled neutrally rather than as an
 * error — a worse attempt is ordinary practice, not a failure state.
 */
export function ScoreBadge({ score, delta = null, best = false }: ScoreBadgeProps) {
  const r = 52
  const c = 2 * Math.PI * r
  const offset = c * (1 - Math.max(0, Math.min(100, score)) / 100)
  const { klass, label } = band(score)

  return (
    <div className={`score-badge ${klass}`}>
      <svg viewBox="0 0 120 120" width="132" height="132">
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

      {best && <span className="score-best">Best yet</span>}

      <span className="score-delta">
        {delta === null
          ? 'First attempt at this sign'
          : delta === 0
            ? 'Same as your last try'
            : delta > 0
              ? `+${delta} since your last try`
              : `${delta} since your last try`}
      </span>
    </div>
  )
}
