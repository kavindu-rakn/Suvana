import { Suspense, lazy, useEffect, useState } from 'react'
import { PracticeView } from './components/PracticeView'
import { ProgressView } from './components/ProgressView'
import { ScenarioView } from './components/ScenarioView'

// Author-only surfaces, split out of the learner's bundle. A participant never
// opens Record, Library or Study, so there is no reason for them to download
// the reference recorder, the JSON import/export path or the pilot export.
const RecordView = lazy(() => import('./components/RecordView').then((m) => ({ default: m.RecordView })))
const LibraryView = lazy(() => import('./components/LibraryView').then((m) => ({ default: m.LibraryView })))
const StudyView = lazy(() => import('./components/StudyView').then((m) => ({ default: m.StudyView })))
import { persistMode, readMode } from './app/mode'
import type { AppMode } from './app/mode'
import './components/views.css'

type Tab = 'practice' | 'scenario' | 'record' | 'library' | 'progress' | 'study'

/**
 * Tab glyphs. Inline paths rather than an icon package — five icons is not
 * worth a dependency, and these inherit currentColor so they follow the tab's
 * active/inactive state for free. They are decorative: every tab keeps its
 * text label, so the icon is never the only cue. Shown only in the mobile
 * bottom bar, where a label alone reads as a row of links rather than a nav.
 */
const ICONS: Record<Tab, string> = {
  // a hand, mid-sign
  practice:
    'M8 11V6.5a1.5 1.5 0 0 1 3 0V11m0 0V4.5a1.5 1.5 0 0 1 3 0V11m0 0V6.5a1.5 1.5 0 0 1 3 0V13a6 6 0 0 1-6 6a5 5 0 0 1-4.3-2.4L6 14.6a1.5 1.5 0 0 1 2.5-1.6',
  // a speech bubble
  scenario: 'M20 12a7 7 0 0 1-7 7H8l-4 3v-10a7 7 0 0 1 7-7h2a7 7 0 0 1 7 7Z',
  // a record dot
  record: 'M12 4a8 8 0 1 0 0 16a8 8 0 0 0 0-16Zm0 4.5a3.5 3.5 0 1 1 0 7a3.5 3.5 0 0 1 0-7Z',
  // stacked cards
  library: 'M4 7h16M4 12h16M4 17h10',
  // a rising bar chart
  progress: 'M4 20V12m5 8V5m5 15v-6m5 6V9',
  // a clipboard
  study: 'M9 4h6v3H9zM9 5.5H6v14h12v-14h-3M9 12h6M9 16h4',
}

const ALL_TABS: Record<Tab, string> = {
  practice: 'Practice',
  scenario: 'Scenario',
  progress: 'Progress',
  record: 'Record',
  library: 'Library',
  study: 'Study',
}

/** What a learner sees. Record and Library author reference data; Study is the
 *  researcher's pilot tooling. None of the three is the learner's job. */
const LEARNER_TABS: Tab[] = ['practice', 'scenario', 'progress']
const AUTHOR_TABS: Tab[] = [...LEARNER_TABS, 'record', 'library', 'study']

function App() {
  const [tab, setTab] = useState<Tab>('practice')
  const [mode, setModeState] = useState<AppMode>(readMode)

  const tabs = mode === 'author' ? AUTHOR_TABS : LEARNER_TABS

  function setMode(next: AppMode) {
    setModeState(next)
    persistMode(next)
    // Leaving author mode while standing on an author-only tab would otherwise
    // render nothing at all.
    const allowed = next === 'author' ? AUTHOR_TABS : LEARNER_TABS
    setTab((cur) => (allowed.includes(cur) ? cur : 'practice'))
  }

  // The tracking engine is a lazy chunk (see vision/handTracker.ts), which
  // keeps it off the critical path. Warm it once the page is idle so that
  // "Start camera" is still a cache hit rather than a cold 135 KB fetch.
  useEffect(() => {
    const warm = () => void import('@mediapipe/tasks-vision')
    if (typeof requestIdleCallback === 'function') {
      const id = requestIdleCallback(warm)
      return () => cancelIdleCallback(id)
    }
    // Safari has no requestIdleCallback; a timeout is close enough for a prefetch.
    const id = window.setTimeout(warm, 2000)
    return () => window.clearTimeout(id)
  }, [])

  return (
    <div className="app">
      {mode === 'author' && (
        // Deliberately loud: a screenshot taken in this mode has to be
        // unambiguous about which build it shows.
        <div className="mode-banner">
          <span>
            <strong>Author &amp; researcher tools.</strong> This is not what a learner sees.
          </span>
          <button className="btn btn-ghost" onClick={() => setMode('learner')}>
            Exit to learner view
          </button>
        </div>
      )}

      <header className="app-header">
        <p className="app-kicker">
          <a href="/">
            <span className="si" lang="si">
              සුවණ
            </span>{' '}
            Suvana
          </a>{' '}
          · R26-SE-019 · Learning &amp; Practice Module
        </p>
        <h1>Learn</h1>
        <p className="app-sub">
          Learn and practise Sri Lankan Sign Language — record a sign, get it scored against a
          reference, and see what to fix.
        </p>
        <nav className="tabs" aria-label="Sections" data-count={tabs.length}>
          {tabs.map((id) => (
            <button
              key={id}
              className={tab === id ? 'tab active' : 'tab'}
              // The active tab is otherwise signalled by colour alone, which a
              // screen reader cannot convey.
              aria-current={tab === id ? 'page' : undefined}
              onClick={() => setTab(id)}
            >
              <svg
                className="tab-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d={ICONS[id]} />
              </svg>
              <span className="tab-label">{ALL_TABS[id]}</span>
            </button>
          ))}
        </nav>
      </header>

      <main>
        {tab === 'practice' && <PracticeView />}
        {tab === 'scenario' && <ScenarioView />}
        {tab === 'progress' && <ProgressView />}
        {(tab === 'record' || tab === 'library' || tab === 'study') && (
          <Suspense fallback={<p className="empty-state">Loading…</p>}>
            {tab === 'record' && <RecordView />}
            {tab === 'library' && <LibraryView />}
            {tab === 'study' && <StudyView />}
          </Suspense>
        )}
      </main>

      <footer className="app-footer">
        <p>
          Hand tracking runs fully in your browser (MediaPipe HandLandmarker) — no video ever
          leaves your device.
        </p>
        {mode === 'learner' && (
          <button className="link-button" onClick={() => setMode('author')}>
            Research &amp; authoring tools
          </button>
        )}
      </footer>
    </div>
  )
}

export default App
