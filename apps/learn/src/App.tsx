import { Suspense, lazy, useEffect, useState } from 'react'
import { PracticeView } from './components/PracticeView'
import { ProgressView } from './components/ProgressView'
import { ScenarioView } from './components/ScenarioView'
import { Hero } from './components/Hero'
import { ThemeToggle } from './components/ThemeToggle'

// Author-only surfaces, split out of the learner's bundle. A participant never
// opens Record, Library or Study, so there is no reason for them to download
// the reference recorder, the JSON import/export path or the pilot export.
const RecordView = lazy(() => import('./components/RecordView').then((m) => ({ default: m.RecordView })))
const LibraryView = lazy(() => import('./components/LibraryView').then((m) => ({ default: m.LibraryView })))
const StudyView = lazy(() => import('./components/StudyView').then((m) => ({ default: m.StudyView })))
import { persistMode, readMode } from './app/mode'
import type { AppMode } from './app/mode'
import { ALL_TABS, AUTHOR_TABS, ICONS, LEARNER_TABS } from './app/tabs'
import type { Tab } from './app/tabs'
import { ACCOUNT_URL, SIGN_IN_URL, fetchSession } from './app/session'
import type { SuvanaUser } from './app/session'
import './components/views.css'

/**
 * Whether the learner has passed the hero and is inside the tool.
 *
 * sessionStorage, not localStorage, and not component state alone: arriving at
 * /learn/ should show the front door, but reloading mid-practice — or the tab
 * being restored — must not throw the learner back out to it. One tab session
 * is exactly the right lifetime.
 */
const ENTERED_KEY = 'suvana.learn.entered'

function readEntered(): boolean {
  try {
    return sessionStorage.getItem(ENTERED_KEY) === '1'
  } catch {
    // Private-mode Safari throws on access; the hero is a safe default.
    return false
  }
}

function App() {
  const [tab, setTab] = useState<Tab>('practice')
  const [mode, setModeState] = useState<AppMode>(readMode)
  const [entered, setEntered] = useState<boolean>(readEntered)
  // undefined while unknown, null when signed out — so the bar shows nothing
  // rather than flashing "Sign in" at someone who is already signed in.
  const [user, setUser] = useState<SuvanaUser | null | undefined>(undefined)

  const tabs = mode === 'author' ? AUTHOR_TABS : LEARNER_TABS

  function setMode(next: AppMode) {
    setModeState(next)
    persistMode(next)
    // Leaving author mode while standing on an author-only tab would otherwise
    // render nothing at all.
    const allowed = next === 'author' ? AUTHOR_TABS : LEARNER_TABS
    setTab((cur) => (allowed.includes(cur) ? cur : 'practice'))
  }

  function enter(next: Tab) {
    setTab(next)
    setEntered(true)
    try {
      sessionStorage.setItem(ENTERED_KEY, '1')
    } catch {
      /* Non-fatal: the hero simply reappears on reload. */
    }
  }

  function leaveToHero() {
    setEntered(false)
    try {
      sessionStorage.removeItem(ENTERED_KEY)
    } catch {
      /* Non-fatal. */
    }
  }

  // The tracking engine is a lazy chunk (see vision/handTracker.ts), which
  // keeps it off the critical path. Warm it once the page is idle so that
  // "Start camera" is still a cache hit rather than a cold 135 KB fetch.
  // Warming from the hero too is deliberate: that is free reading time.
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

  // Who is signed in, platform-wide. Never blocks anything: practice works
  // signed out, and an unreachable Communicate deployment resolves to null.
  useEffect(() => {
    const ac = new AbortController()
    void fetchSession(ac.signal).then(setUser)
    return () => ac.abort()
  }, [])

  if (!entered) {
    return (
      <div className="app app-hero-mode">
        <Hero onEnter={enter} />
      </div>
    )
  }

  return (
    <div className="app">
      {mode === 'author' && (
        // Deliberately loud: a screenshot taken in this mode has to be
        // unambiguous about which build it shows.
        <div className="mode-banner-wrap">
          <div className="mode-banner">
            <span>
              <strong>Author &amp; researcher tools.</strong> This is not what a learner sees.
            </span>
            <button className="btn btn-ghost" onClick={() => setMode('learner')}>
              Exit to learner view
            </button>
          </div>
        </div>
      )}

      <header className="app-bar">
        <div className="app-bar-inner">
          <button className="app-brand" onClick={leaveToHero} aria-label="Learn overview">
            <img
              className="app-brand-mark"
              src={`${import.meta.env.BASE_URL}branding/suvana-mark.png`}
              alt=""
            />
            <span className="app-brand-text">
              <span className="si" lang="si">
                සුවණ
              </span>{' '}
              Suvana
            </span>
            <span className="app-brand-sep" aria-hidden="true" />
            <span className="app-brand-module">Learn</span>
          </button>

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

          {/* One Suvana account, surfaced here but never required: progress
              lives in this browser, so gating practice would promise a
              portability that does not exist yet. */}
          <div className="app-account">
            <ThemeToggle />
            {user === undefined ? null : user ? (
              <a className="app-account-link" href={ACCOUNT_URL} title={user.email ?? undefined}>
                {user.name ?? user.email}
                {user.role === 'admin' && <span className="app-account-role">admin</span>}
              </a>
            ) : (
              <a className="app-account-link" href={SIGN_IN_URL}>
                Sign in
              </a>
            )}
          </div>
        </div>
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
