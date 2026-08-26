import type { Tab } from '../app/tabs'
import { ThemeToggle } from './ThemeToggle'

/**
 * The Learn module's front door.
 *
 * Every other Suvana surface opens with a page that explains itself before it
 * asks for anything — Communicate and Recognize both do. Learn used to drop
 * straight into a camera tool, which read as an internal research instrument
 * rather than a product. This is that missing first screen.
 *
 * The decorative constellation is deliberately NOT a real skeleton render:
 * landmark skeletons are the least legible thing the app draws (video
 * references are the planned fix), so leading with one would showcase the
 * weakest visual. It suggests hand tracking without claiming to be output.
 */

const STEPS = [
  {
    n: '01',
    title: 'Choose a sign',
    body: 'Pick from 490 signs, or let a session choose the ones you most need to practise.',
  },
  {
    n: '02',
    title: 'Record your attempt',
    body: 'Hand tracking runs inside your browser. No video is uploaded, and nothing is stored on a server.',
  },
  {
    n: '03',
    title: 'See what to fix',
    body: 'A match score against real-signer references, plus which fingers and which part of the movement drifted.',
  },
]

export function Hero({ onEnter }: { onEnter: (tab: Tab) => void }) {
  return (
    <div className="lhero">
      <div className="lhero-topbar">
        <a className="lhero-back" href="/">
          ← All Suvana modules
        </a>
        <ThemeToggle />
      </div>

      <section className="lhero-top">
        <div className="lhero-copy">
          <p className="lhero-eyebrow">
            <img
              className="lhero-mark"
              src={`${import.meta.env.BASE_URL}branding/suvana-mark.png`}
              alt=""
            />
            <span>
              <span className="si" lang="si">
                සුවණ
              </span>{' '}
              Suvana · Learn
            </span>
          </p>

          <h1 className="lhero-title">
            Learn Sri Lankan Sign Language by <em>signing</em> it.
          </h1>

          <p className="lhero-sub">
            Point your camera and sign. Every attempt is scored against recordings of real
            signers — with corrections down to individual fingers.
          </p>

          <div className="lhero-cta">
            <button className="btn" onClick={() => onEnter('practice')}>
              Start practising
            </button>
            <button className="btn btn-ghost" onClick={() => onEnter('scenario')}>
              Try a conversation
            </button>
          </div>

          {/* Hardcoded, and therefore drift-prone: these went stale the moment
              the corpus grew from 351/362 to 490/501. Deriving them would mean
              fetching the 300 KB index on the hero, before the learner has
              asked for anything — too much to pay for two numerals. Re-check
              them against `public/reference-index.json` whenever the corpus
              changes; `referenceIndex.test.ts` is where a guard would go. */}
          <ul className="lhero-stats">
            <li>
              <strong>490</strong> signs
            </li>
            <li>
              <strong>501</strong> reference recordings
            </li>
            <li>
              <strong>Private</strong> — nothing leaves your device
            </li>
          </ul>
        </div>

        <div className="lhero-art" aria-hidden="true">
          <svg viewBox="0 0 220 260" fill="none" role="presentation">
            <defs>
              <linearGradient id="lheroGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="var(--accent)" />
                <stop offset="100%" stopColor="var(--caution)" />
              </linearGradient>
            </defs>
            {/* Palm mass first: without it the bones read as a branching tree
                rather than a hand. */}
            <path
              d="M104 226 L78 156 Q76 146 88 146 L150 152 Q160 154 158 166 L140 224 Q132 234 116 234 Z"
              fill="url(#lheroGrad)"
              opacity="0.1"
            />
            {/* Then bones, then joints on top — the same order the real overlay
                uses in vision/drawing.ts. */}
            <g stroke="url(#lheroGrad)" strokeWidth="2.2" strokeLinecap="round" opacity="0.6">
              {/* wrist → palm, and palm → each knuckle */}
              <path d="M112 236 L112 206 M112 206 L86 152 M112 206 L110 146 M112 206 L134 150 M112 206 L154 164 M112 206 L82 196" />
              {/* index, middle, ring, pinky */}
              <path d="M86 152 L80 118 M80 118 L76 94 M110 146 L108 108 M108 108 L106 82 M134 150 L140 114 M140 114 L144 90 M154 164 L166 136 M166 136 L174 118" />
              {/* thumb, angled away from the fingers */}
              <path d="M82 196 L58 176 M58 176 L44 158" />
            </g>
            <g fill="url(#lheroGrad)">
              {[
                [112, 236],
                [112, 206],
                [86, 152],
                [110, 146],
                [134, 150],
                [154, 164],
                [82, 196],
                [80, 118],
                [108, 108],
                [140, 114],
                [166, 136],
                [58, 176],
                [76, 94],
                [106, 82],
                [144, 90],
                [174, 118],
                [44, 158],
              ].map(([cx, cy], i) => (
                <circle key={i} cx={cx} cy={cy} r={i === 0 ? 5.5 : 4} />
              ))}
            </g>
          </svg>
        </div>
      </section>

      <section className="lsteps" aria-label="How it works">
        {STEPS.map((s) => (
          <article className="lstep" key={s.n}>
            <p className="lstep-n">{s.n}</p>
            <h2>{s.title}</h2>
            <p>{s.body}</p>
          </article>
        ))}
      </section>

      <p className="lhero-foot">
        Reference recordings come from the team's shared SSL corpus. Scores are guidance for
        practice, not a certified assessment of your signing.
      </p>
    </div>
  )
}
