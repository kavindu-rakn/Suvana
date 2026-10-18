import { Suspense, lazy, useEffect, useState } from 'react'
import { PracticeView } from './components/PracticeView'
import { Hero } from './components/Hero'

// Only Hero and Practice are needed on first paint. Secondary views load when
// selected; named exports retain their existing props and component identity.
const ProgressView = lazy(() => import('./components/ProgressView').then((m) => ({ default: m.ProgressView })))
const PathView = lazy(() => import('./components/PathView').then((m) => ({ default: m.PathView })))
const ScenarioView = lazy(() => import('./components/ScenarioView').then((m) => ({ default: m.ScenarioView })))
const RecordView = lazy(() => import('./components/RecordView').then((m) => ({ default: m.RecordView })))
const LibraryView = lazy(() => import('./components/LibraryView').then((m) => ({ default: m.LibraryView })))
const StudyView = lazy(() => import('./components/StudyView').then((m) => ({ default: m.StudyView })))
import { AppNavBar } from './components/AppNavBar'
import { Attribution, ContentNotice } from './components/Attribution'
import { persistMode, readMode } from './app/mode'
import type { AppMode } from './app/mode'
import { AUTHOR_TABS, LEARNER_TABS } from './app/tabs'
import type { Tab } from './app/tabs'
import { fetchSession } from './app/session'
import type { SuvanaUser } from './app/session'
import { AccountButton } from './app/AccountButton'
import './components/views.css'
import { currentGloss, saveSession } from './learner/session'
import type { PracticeSession } from './learner/session'
import { loadReferenceIndex } from './storage/bundledReferences'
import { matchSignDeepLink } from './app/signDeepLink'

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
  const [signSearch] = useState(() => window.location.search)
  const [resolvingSign, setResolvingSign] = useState(() => Boolean(new URLSearchParams(signSearch).get('sign')))
  const [tab, setTab] = useState<Tab>('practice')
  const [mode, setModeState] = useState<AppMode>(readMode)
  const [entered, setEntered] = useState<boolean>(readEntered)
  // undefined while unknown, null when signed out — so the bar shows nothing
  // rather than flashing "Sign in" at someone who is already signed in.
  const [user, setUser] = useState<SuvanaUser | null | undefined>(undefined)

  // A gloss handed from Progress's "Practise" rows to the next mount of
  // PracticeView. In-memory and one-shot: reloading just lands you in Practice,
  // which is fine. PracticeView clears it once it has selected the sign.
  const [practiceIntent, setPracticeIntent] = useState<string | null>(null)
  const [practiceKey, setPracticeKey] = useState(0)

  useEffect(() => {
    if (!new URLSearchParams(signSearch).get('sign')) return
    let cancelled = false
    void loadReferenceIndex().then(index => {
      if (cancelled) return
      const gloss = matchSignDeepLink(signSearch, index)
      if (gloss) {
        setPracticeIntent(gloss)
        setEntered(true)
        try { sessionStorage.setItem(ENTERED_KEY, '1') } catch { /* Non-fatal. */ }
      }
      setResolvingSign(false)
    })
    return () => { cancelled = true }
  }, [signSearch])

  function openPractice(gloss?: string) {
    setPracticeIntent(gloss ?? null)
    setPracticeKey(value => value + 1)
    setTab('practice')
  }

  function openSession(session: PracticeSession) {
    saveSession(session)
    openPractice(currentGloss(session) ?? undefined)
  }

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
    if (import.meta.env.VITE_SUVANA !== '1') return
    const ac = new AbortController()
    void fetchSession(ac.signal).then(setUser)
    return () => ac.abort()
  }, [])

  // Resolve before mounting Hero or Practice so a valid link opens straight in
  // Watch, including when a previous visit already passed the landing page.
  if (resolvingSign) return <p className="empty-state" role="status">Loading…</p>

  if (!entered) {
    return (
      <div className="app app-hero-mode">
        <Hero onEnter={enter} />
      </div>
    )
  }

  return (
    <div className="app" data-mode={mode}>
      <AppNavBar
        tab={tab}
        tabs={tabs}
        onSelectTab={setTab}
        mode={mode}
        onSetMode={setMode}
        onLeaveToHero={leaveToHero}
        // One Suvana account, surfaced here but never required: progress
        // lives in this browser, so gating practice would promise a
        // portability that does not exist yet.
        account={import.meta.env.VITE_SUVANA === '1' ? <AccountButton user={user} /> : undefined}
      />

      {/* data-tab drives the shell width: Progress is a dashboard and takes
          the wide shell, every other tab keeps the reading column. */}
      <main data-tab={tab}>
        {tab === 'practice' && (
          <PracticeView
            key={practiceKey}
            initialGloss={practiceIntent}
            onIntentConsumed={() => setPracticeIntent(null)}
          />
        )}
        {tab !== 'practice' && (
          <Suspense fallback={<p className="empty-state" role="status">Loading…</p>}>
            {tab === 'path' && <PathView onPractise={openPractice} onSession={openSession} />}
            {tab === 'scenario' && <ScenarioView />}
            {tab === 'progress' && <ProgressView onPractise={openPractice} />}
            {tab === 'record' && <RecordView />}
            {tab === 'library' && <LibraryView />}
            {tab === 'study' && <StudyView />}
          </Suspense>
        )}
      </main>

      <footer className="app-footer">
        <ContentNotice />
        <details>
          <summary>Corpus credits and licences</summary>
          <Attribution />
        </details>
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
