import React, { useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { ScoreBadge, type HandFeedback } from '../components/ScoreBadge'
import { FINGER_LABEL, type Finger } from '../scoring/landmarks'
import { RotateCcw, ArrowRight, X, Sun, Moon } from 'lucide-react'
import '../index.css'
import '../components/views.css'

import scoreHigh from './fixtures/score-high.json'
import scoreMid from './fixtures/score-mid.json'
import scoreTwoHanded from './fixtures/score-two-handed.json'
import scoreNoHands from './fixtures/score-nohands.json'

interface ResultFixture {
  score: number
  delta?: number
  best?: boolean
  noHands?: boolean
  gloss: string
  resultNotes: string[]
  fingerFocus?: string[]
  hands?: HandFeedback[]
}

const FIXTURES: Record<string, ResultFixture> = {
  'score-high': scoreHigh as ResultFixture,
  'score-mid': scoreMid as ResultFixture,
  'score-two-handed': scoreTwoHanded as ResultFixture,
  'score-nohands': scoreNoHands as ResultFixture,
}

function FixtureCard({ id, data }: { id: string; data: ResultFixture }) {
  const isNoHands = !!data.noHands

  return (
    <div
      className="aww-fixture-card"
      data-fixture-id={id}
      style={{
        background: 'var(--surface, #142020)',
        border: '1px solid var(--border, rgba(255,255,255,0.08))',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '32px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          borderBottom: '1px solid var(--border, rgba(255,255,255,0.06))',
          paddingBottom: '8px',
        }}
      >
        <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--foreground, #f0fdfa)' }}>
          Fixture: <code>{id}</code> ({data.gloss})
        </h3>
        <span
          style={{
            fontSize: '0.8rem',
            padding: '4px 8px',
            borderRadius: '999px',
            background: 'var(--accent, #0ea5e9)',
            color: '#fff',
          }}
        >
          {isNoHands ? 'No Hands' : `${data.score} Match`}
        </span>
      </div>

      <div className="aww-result-overlay" style={{ position: 'relative', minHeight: 'auto', padding: 0 }}>
        {isNoHands ? (
          <div className="aww-result-panel aww-result-nohands" style={{ margin: '0 auto' }}>
            <div className="aww-nohands-icon-wrap">
              <X size={32} />
            </div>
            <h3 className="aww-result-nohands-title">Couldn't see your hands</h3>
            <p className="aww-result-lead">
              The AI tracker didn't detect a hand gesture in that take.
            </p>
            <div className="aww-diagnostics-grid">
              <div className="aww-diag-item">
                <span className="aww-diag-icon">💡</span>
                <div>
                  <strong>Check Room Lighting</strong>
                  <p>Ensure light is in front of you, not behind.</p>
                </div>
              </div>
              <div className="aww-diag-item">
                <span className="aww-diag-icon">📐</span>
                <div>
                  <strong>Camera Distance</strong>
                  <p>Step back until your head &amp; shoulders are visible.</p>
                </div>
              </div>
              <div className="aww-diag-item">
                <span className="aww-diag-icon">✋</span>
                <div>
                  <strong>Hand Visibility</strong>
                  <p>Raise your hands clearly within the camera frame.</p>
                </div>
              </div>
            </div>
            <div className="aww-result-actions">
              <button className="aww-result-btn aww-result-btn-retry" type="button">
                <RotateCcw size={16} />
                <span>Try Again</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="aww-result-panel" style={{ margin: '0 auto' }}>
            <ScoreBadge
              score={data.score}
              delta={data.delta ?? null}
              best={data.best ?? false}
              hands={data.hands}
            />
            <div className="aww-result-feedback">
              {data.score === 100 ? (
                <p className="perfect-hint">Flawless match. Perfect execution.</p>
              ) : (
                <>
                  {data.resultNotes.map((note, i) => (
                    <p key={i}>{note}</p>
                  ))}
                  {data.fingerFocus && data.fingerFocus.length > 0 && (
                    <div className="focus-block">
                      <p className="pane-label">Focus on</p>
                      <div className="finger-chips">
                        {data.fingerFocus.map((f) => (
                          <span key={f} className="finger-chip">
                            {FINGER_LABEL[f as Finger] || f}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
              <div className="aww-result-actions">
                <button className="aww-result-btn aww-result-btn-retry" type="button">
                  <RotateCcw size={16} />
                  <span>Try Again</span>
                </button>
                <button className="aww-result-btn aww-result-btn-next" type="button">
                  <span>Next Sign</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function DevFixturesApp() {
  const [selectedKey, setSelectedKey] = useState<string>('all')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--background, #0a1414)',
        color: 'var(--foreground, #f0fdfa)',
        padding: '24px',
        boxSizing: 'border-box',
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '24px',
          paddingBottom: '16px',
          borderBottom: '1px solid var(--border, rgba(255,255,255,0.1))',
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>
            Learn Dev Fixtures Preview
          </h1>
          <p style={{ margin: '4px 0 0', opacity: 0.7, fontSize: '0.9rem' }}>
            Isolated render of ScoreBadge and Result Card states for visual testing &amp; snapshots
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setSelectedKey('all')}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border, rgba(255,255,255,0.15))',
              background: selectedKey === 'all' ? 'var(--accent, #0ea5e9)' : 'transparent',
              color: 'inherit',
              cursor: 'pointer',
            }}
          >
            Show All
          </button>
          {Object.keys(FIXTURES).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setSelectedKey(k)}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border, rgba(255,255,255,0.15))',
                background: selectedKey === k ? 'var(--accent, #0ea5e9)' : 'transparent',
                color: 'inherit',
                cursor: 'pointer',
              }}
            >
              {k}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border, rgba(255,255,255,0.15))',
              background: 'transparent',
              color: 'inherit',
              cursor: 'pointer',
              marginLeft: '8px',
            }}
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>
        </div>
      </header>

      <main style={{ maxWidth: '960px', margin: '0 auto' }}>
        {selectedKey === 'all' ? (
          Object.entries(FIXTURES).map(([k, f]) => <FixtureCard key={k} id={k} data={f} />)
        ) : (
          <FixtureCard id={selectedKey} data={FIXTURES[selectedKey]} />
        )}
      </main>
    </div>
  )
}

const container = document.getElementById('fixtures-root')
if (container) {
  const root = createRoot(container)
  root.render(
    <React.StrictMode>
      <DevFixturesApp />
    </React.StrictMode>,
  )
}
