import { band } from '../scoring/band'
import type { Finger } from '../scoring/landmarks'

export interface FingerScoreInfo {
  name: string
  key: Finger
  accuracy: number
  isWeak?: boolean
}

export interface HandAccuracyInfo {
  handedness: 'Left' | 'Right'
  score: number
  missing?: boolean
  fingers: FingerScoreInfo[]
}

interface ScoreBadgeProps {
  score: number
  /** Change against previous attempt */
  delta?: number | null
  /** True when attempt beats all earlier attempts */
  best?: boolean
  /** Hide delta line */
  hideDelta?: boolean
  /** Whether the sign is two-handed */
  twoHanded?: boolean
  /** Per-hand detailed finger accuracy breakdowns */
  handsData?: HandAccuracyInfo[]
}

/**
 * Anatomical Hand Vector Illustration
 * Renders an anatomical SVG hand representation with color-coded fingers.
 */
function AnatomicalHandSvg({
  handedness,
  fingers,
  overallScore,
  missing = false,
}: {
  handedness: 'Left' | 'Right'
  fingers: FingerScoreInfo[]
  overallScore: number
  missing?: boolean
}) {
  const isLeft = handedness === 'Left'
  const fingerMap = new Map<Finger, FingerScoreInfo>(fingers.map((f) => [f.key, f]))

  const getFingerColor = (key: Finger) => {
    if (missing) return 'var(--danger, #ef4444)'
    const f = fingerMap.get(key)
    const acc = f ? f.accuracy : overallScore
    if (acc >= 82) return 'var(--success, #2dd4bf)'
    if (acc >= 62) return 'var(--caution, #daa520)'
    return 'var(--danger, #ef4444)'
  }

  const getFingerAccuracy = (key: Finger) => {
    if (missing) return 0
    const f = fingerMap.get(key)
    return f ? f.accuracy : overallScore
  }

  return (
    <div className={`aww-hand-widget ${missing ? 'is-missing' : ''}`}>
      <div className="aww-hand-widget-header">
        <span className="aww-hand-name">{handedness} Hand</span>
        <span className={`aww-hand-score ${missing ? 'score-missing' : ''}`}>
          {missing ? 'Missing' : `${overallScore}%`}
        </span>
      </div>

      <div className="aww-hand-svg-container">
        <svg
          viewBox="0 0 160 210"
          className={`aww-hand-svg ${isLeft ? 'hand-left' : 'hand-right'}`}
          aria-label={`${handedness} Hand Joint Accuracy Map`}
        >
          {/* Wrist Base */}
          <path
            d="M 52 195 Q 80 205 108 195 L 104 165 Q 80 170 56 165 Z"
            className="hand-wrist-base"
          />

          {/* Palm Mesh Surface */}
          <path
            d="M 40 160 Q 30 115 42 85 Q 80 75 118 85 Q 130 115 120 160 Z"
            className="hand-palm-surface"
          />

          {/* Thumb */}
          <g className="hand-finger thumb-group">
            <title>{`Thumb: ${getFingerAccuracy('thumb')}%`}</title>
            <path
              d="M 40 145 C 18 135 12 105 24 92 C 34 82 48 98 46 118 Z"
              fill={getFingerColor('thumb')}
              className="finger-contour"
            />
            <circle cx="28" cy="98" r="4.5" className="joint-dot" />
            <circle cx="38" cy="120" r="4.5" className="joint-dot" />
          </g>

          {/* Index Finger */}
          <g className="hand-finger index-group">
            <title>{`Index: ${getFingerAccuracy('index')}%`}</title>
            <path
              d="M 44 85 C 43 55 45 28 54 22 C 63 28 65 55 64 85 Z"
              fill={getFingerColor('index')}
              className="finger-contour"
            />
            <circle cx="54" cy="32" r="4.5" className="joint-dot" />
            <circle cx="54" cy="56" r="4.5" className="joint-dot" />
            <circle cx="54" cy="80" r="4.5" className="joint-dot" />
          </g>

          {/* Middle Finger */}
          <g className="hand-finger middle-group">
            <title>{`Middle: ${getFingerAccuracy('middle')}%`}</title>
            <path
              d="M 68 80 C 67 48 69 18 78 12 C 87 18 89 48 88 80 Z"
              fill={getFingerColor('middle')}
              className="finger-contour"
            />
            <circle cx="78" cy="24" r="4.5" className="joint-dot" />
            <circle cx="78" cy="50" r="4.5" className="joint-dot" />
            <circle cx="78" cy="76" r="4.5" className="joint-dot" />
          </g>

          {/* Ring Finger */}
          <g className="hand-finger ring-group">
            <title>{`Ring: ${getFingerAccuracy('ring')}%`}</title>
            <path
              d="M 92 85 C 91 58 93 30 102 26 C 111 30 113 58 112 85 Z"
              fill={getFingerColor('ring')}
              className="finger-contour"
            />
            <circle cx="102" cy="36" r="4.5" className="joint-dot" />
            <circle cx="102" cy="60" r="4.5" className="joint-dot" />
            <circle cx="102" cy="82" r="4.5" className="joint-dot" />
          </g>

          {/* Pinky Finger */}
          <g className="hand-finger pinky-group">
            <title>{`Pinky: ${getFingerAccuracy('pinky')}%`}</title>
            <path
              d="M 116 95 C 117 72 121 48 128 44 C 135 48 137 72 134 98 Z"
              fill={getFingerColor('pinky')}
              className="finger-contour"
            />
            <circle cx="127" cy="52" r="4.5" className="joint-dot" />
            <circle cx="126" cy="74" r="4.5" className="joint-dot" />
            <circle cx="125" cy="94" r="4.5" className="joint-dot" />
          </g>
        </svg>
      </div>

      {/* Mini Finger Accuracy Tags */}
      <div className="aww-finger-pills">
        {(['thumb', 'index', 'middle', 'ring', 'pinky'] as Finger[]).map((k) => {
          const acc = getFingerAccuracy(k)
          const f = fingerMap.get(k)
          const name = f?.name ?? (k.charAt(0).toUpperCase() + k.slice(1))
          return (
            <div key={k} className="aww-finger-pill" style={{ borderColor: getFingerColor(k) }}>
              <span className="aww-finger-pill-name">{name}</span>
              <span className="aww-finger-pill-acc">{missing ? '—' : `${acc}%`}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Circular progress ring showing 0–100 match score with anatomical hand illustration breakdown.
 */
export function ScoreBadge({
  score,
  delta = null,
  best = false,
  hideDelta = false,
  twoHanded = false,
  handsData = [],
}: ScoreBadgeProps) {
  const r = 54
  const c = 2 * Math.PI * r
  const offset = c * (1 - Math.max(0, Math.min(100, score)) / 100)
  const { klass, label } = band(score)

  const tierTitle =
    score >= 90
      ? 'Master Execution'
      : score >= 75
        ? 'Fluent Signing'
        : score >= 60
          ? 'Developing Form'
          : 'Refining Technique'

  // Default fallback hand if handsData is empty
  const activeHands: HandAccuracyInfo[] =
    handsData.length > 0
      ? handsData
      : twoHanded
        ? [
            {
              handedness: 'Left',
              score,
              fingers: [
                { name: 'Thumb', key: 'thumb', accuracy: score },
                { name: 'Index', key: 'index', accuracy: score },
                { name: 'Middle', key: 'middle', accuracy: score },
                { name: 'Ring', key: 'ring', accuracy: score },
                { name: 'Pinky', key: 'pinky', accuracy: score },
              ],
            },
            {
              handedness: 'Right',
              score,
              fingers: [
                { name: 'Thumb', key: 'thumb', accuracy: score },
                { name: 'Index', key: 'index', accuracy: score },
                { name: 'Middle', key: 'middle', accuracy: score },
                { name: 'Ring', key: 'ring', accuracy: score },
                { name: 'Pinky', key: 'pinky', accuracy: score },
              ],
            },
          ]
        : [
            {
              handedness: 'Right',
              score,
              fingers: [
                { name: 'Thumb', key: 'thumb', accuracy: score },
                { name: 'Index', key: 'index', accuracy: score },
                { name: 'Middle', key: 'middle', accuracy: score },
                { name: 'Ring', key: 'ring', accuracy: score },
                { name: 'Pinky', key: 'pinky', accuracy: score },
              ],
            },
          ]

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
        <span className="score-label aww-score-label">{tierTitle}</span>
        <span className="aww-score-subcaption">{label}</span>
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

      {/* Anatomical Hand Joint Accuracy Matrix */}
      <div className="aww-anatomical-hand-section">
        <div className="aww-hand-section-title">
          <span>DTW JOINT PRECISION MAP</span>
          <span className="aww-hand-mode-tag">
            {twoHanded ? 'Two-Handed Sign' : 'Single-Handed Sign'}
          </span>
        </div>

        <div className={`aww-hands-layout ${twoHanded ? 'dual-hands' : 'single-hand'}`}>
          {activeHands.map((h) => (
            <AnatomicalHandSvg
              key={h.handedness}
              handedness={h.handedness}
              fingers={h.fingers}
              overallScore={h.score}
              missing={h.missing}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
