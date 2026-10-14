import { useEffect, useState, useMemo, useRef } from 'react'
import { listAttempts } from '../learner/attemptLog'
import { dailyActivity } from '../learner/activity'
import type { DayBucket } from '../learner/activity'
import { isDueReview, practiceNeed, summarizeAll } from '../learner/mastery'
import type { GlossMastery, MasteryLevel } from '../learner/mastery'
import { buildSession, clearSession } from '../learner/session'
import { translationOf } from '../data/translations'
import { listRecordings } from '../storage/recordingStore'
import { loadReferenceIndex } from '../storage/bundledReferences'
import { pickReferenceList } from '../storage/references'
import { toMeta } from '../vision/types'
import { categoryOf, categoriesIn } from '../data/categories'
import { safeLoad } from '../storage/safeLoad'
import { StorageNotice } from '../storage/StorageNotice'
import type { AttemptLogEntry } from '../learner/attemptLog'
import { getActiveProfile, setActiveProfile, resetProgress } from '../storage/profile'
import type { ProgressProfile } from '../storage/profile'
import { dailyGoal, streak as goalStreak, starsFor, xp, unitState, DAILY_GOAL, TRY_FIRST_STAR, TRY_SECOND_STAR, RECALL_THIRD_STAR } from '../learner/game'
import { CURRICULUM_UNITS } from '../data/curriculum'
import { band } from '../scoring/band'
import './ProgressView.css'

const ACTIVITY_DAYS = 14
// The full catalogue is Practice's job. Progress shows only what the learner
// model rates as most worth doing now, plus a breadth read on the categories.
const FOCUS_COUNT = 6
const REVIEW_COUNT = 5
const CATEGORY_PREVIEW = 8

const LEVEL_LABEL: Record<MasteryLevel, string> = {
  new: 'New',
  learning: 'Learning',
  improving: 'Improving',
  mastered: 'Mastered',
}

function relativeDay(iso: string | null): string {
  if (!iso) return 'not yet'
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  return `${days} days ago`
}

/** Rank numerals read as 01…06, matching the hero's numbered steps. */
function rankLabel(i: number): string {
  return String(i + 1).padStart(2, '0')
}

/**
 * One row of "Practise next" / "Review": rank, gloss + meaning, a mastery
 * meter, the level chip, and the single action that opens Practice on it.
 */
function SignRow({
  s,
  rank,
  animate,
  stars,
  onPractise,
}: {
  s: GlossMastery
  rank: number
  animate: boolean
  stars: number
  onPractise?: (gloss?: string) => void
}) {
  const meaning = translationOf(s.gloss)
  const pct = Math.round(s.mastery * 100)
  const meta =
    s.attempts === 0
      ? 'Not practised yet'
      : `${s.attempts} ${s.attempts === 1 ? 'try' : 'tries'} · ${relativeDay(s.lastPracticedAt)}`

  return (
    <li className="pg-row" style={animate ? ({ '--i': rank } as React.CSSProperties) : undefined}>
      <span className="pg-rank" aria-hidden="true">
        {rankLabel(rank)}
      </span>

      <div className="pg-row-id">
        <p className="pg-row-title">
          <span className="pg-gloss">{s.gloss}</span>
          {meaning && <span className="pg-meaning">{meaning}</span>}
        </p>
        <p className="pg-row-meta">{meta}<span className="pg-row-stars" aria-label={`${stars} of 3 stars`}>{'★'.repeat(stars)}{'☆'.repeat(3 - stars)}</span></p>
      </div>

      <div className="pg-row-meter">
        <div className={`pg-meter is-${s.level}`} aria-hidden="true">
          <div className="pg-meter-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="pg-meter-val" title="Match history estimate">{pct}%</span>
      </div>

      <span className={`pg-chip is-${s.level}`}>{LEVEL_LABEL[s.level]}</span>

      {onPractise && (
        <button type="button" className="pg-go" onClick={() => onPractise(s.gloss)}>
          Practise
          <span className="sr-only"> {s.gloss}</span>
        </button>
      )}
    </li>
  )
}

export function ProgressView({
  onPractise,
}: {
  /** Open the Practice tab. With a gloss, land straight on that sign; without
   *  one, just switch tabs. */
  onPractise?: (gloss?: string) => void
}) {
  const [summaries, setSummaries] = useState<GlossMastery[]>([])
  const [storageOk, setStorageOk] = useState(true)
  const [categoryMap, setCategoryMap] = useState<Map<string, string>>(new Map())
  const [availableCategories, setAvailableCategories] = useState<string[]>([])

  const [attemptCount, setAttemptCount] = useState(0)
  const [avgRecent, setAvgRecent] = useState<number | null>(null)
  const [activity, setActivity] = useState<DayBucket[]>([])
  const [streak, setStreak] = useState(0)
  const [loading, setLoading] = useState(true)

  const [showAllCategories, setShowAllCategories] = useState(false)
  const [attempts, setAttempts] = useState<AttemptLogEntry[]>([])
  const [profile, setProfile] = useState<ProgressProfile>(getActiveProfile)
  const [revision, setRevision] = useState(0)
  const [busy, setBusy] = useState(false)
  const [profileNotice, setProfileNotice] = useState('')
  const [actionNotice, setActionNotice] = useState('')
  const [resetError, setResetError] = useState('')
  const resetDialog = useRef<HTMLDialogElement>(null)

  function switchProfile(next: ProgressProfile) {
    clearSession()
    const persisted = setActiveProfile(next)
    setProfile(next)
    setProfileNotice(persisted ? '' : 'This choice works until you reload the page. Your browser could not save it.')
    setActionNotice('')
    setLoading(true)
    setRevision(value => value + 1)
  }

  async function confirmReset() {
    const target = profile
    setResetError('')
    setBusy(true)
    try {
      await resetProgress(target)
      clearSession()
      resetDialog.current?.close()
      setActionNotice('Progress cleared for this profile.')
      setLoading(true)
      setRevision(value => value + 1)
    } catch {
      setResetError('Could not clear your progress. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  // Gate the row stagger the way Hero.tsx does — the token layer already
  // collapses durations under reduced motion, but this drops the transform
  // offset entirely so nothing sits off its mark waiting for a delay to clear.
  const [animate] = useState(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const { data: [loc, bun, log], storageOk: ok } = await safeLoad(
        listRecordings, loadReferenceIndex, listAttempts,
      )
      if (cancelled) return
      setStorageOk(ok)
      setAttempts(log)
      // The same one-per-gloss list Practice builds, so the totals here and
      // there can never disagree (see hero-copy-must-match-build).
      const refs = pickReferenceList([...loc.map(toMeta), ...bun])
      const glosses = refs.map((r) => r.gloss)

      const cMap = new Map<string, string>()
      for (const r of refs) {
        cMap.set(r.gloss, categoryOf(r))
      }
      setCategoryMap(cMap)
      setAvailableCategories(categoriesIn(refs))

      const now = new Date()
      setSummaries(
        summarizeAll(glosses, log).sort((a, b) => practiceNeed(b, now) - practiceNeed(a, now)),
      )
      setAttemptCount(log.length)
      setActivity(dailyActivity(log, ACTIVITY_DAYS, now))
      setStreak(goalStreak(log, now))
      const recent = log.slice(-10)
      setAvgRecent(
        recent.length > 0
          ? Math.round(recent.reduce((acc, e) => acc + e.score, 0) / recent.length)
          : null,
      )
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [revision])

  const practised = summaries.filter((s) => s.attempts > 0).length
  const mastered = summaries.filter((s) => s.level === 'mastered').length
  const total = summaries.length

  // The same policy PracticeView uses to fill a session — practiceNeed ranking,
  // with the category-aware tie-break that keeps a fresh learner off a run of
  // "1, 100, 1000, …". So this list is literally what "Practise" would queue.
  const focus = useMemo(() => {
    if (summaries.length === 0) return []
    const byGloss = new Map(summaries.map((s) => [s.gloss, s]))
    return buildSession(summaries, FOCUS_COUNT, new Date(), (g) => categoryMap.get(g) ?? 'Other')
      .map((g) => byGloss.get(g))
      .filter((s): s is GlossMastery => s !== undefined)
  }, [summaries, categoryMap])

  // Signs already tried that the model still rates as needing work — the strand
  // "Practise next" leaves out while it is busy introducing new vocabulary.
  const review = useMemo(() => {
    const now = new Date()
    const inFocus = new Set(focus.map((s) => s.gloss))
    return summaries
      .filter(
        (s) => s.attempts > 0 && !inFocus.has(s.gloss) && isDueReview(s, now),
      )
      .sort((a, b) => practiceNeed(b, now) - practiceNeed(a, now))
      .slice(0, REVIEW_COUNT)
  }, [summaries, focus])

  // One breadth row per category, most-worked first.
  const coverage = useMemo(() => {
    return availableCategories
      .map((cat) => {
        const inCat = summaries.filter((s) => (categoryMap.get(s.gloss) ?? 'Other') === cat)
        return {
          cat,
          done: inCat.filter((s) => s.attempts > 0).length,
          total: inCat.length,
        }
      })
      .filter((r) => r.total > 0)
      .sort((a, b) => b.done - a.done || b.total - a.total || a.cat.localeCompare(b.cat))
  }, [summaries, availableCategories, categoryMap])

  const visibleCoverage = showAllCategories ? coverage : coverage.slice(0, CATEGORY_PREVIEW)
  const peak = Math.max(...activity.map((d) => d.attempts), 1)
  const week = activity.slice(-7)

  const profileName = profile === 'demo' ? 'Demo progress' : 'My progress'
  const goal = dailyGoal(attempts)
  const learned = summaries.filter(summary => starsFor(summary.gloss, attempts) >= 2).length
  const dueToday = summaries.filter(summary => isDueReview(summary, new Date())).length
  const approvedUnits = CURRICULUM_UNITS.filter(unit => unit.status === 'approved')

  const settings = (
    <div className="pg-settings">
      <div className="pg-profile-row">
        <label htmlFor="pg-profile">Show</label>
        <select id="pg-profile" value={profile} disabled={loading || busy}
          onChange={event => switchProfile(event.target.value as ProgressProfile)}>
          <option value="default">My progress</option>
          <option value="demo">Demo progress</option>
        </select>
        <button type="button" className="pg-reset-button" disabled={loading || busy || !storageOk}
          onClick={() => { setResetError(''); resetDialog.current?.showModal() }}>Reset progress</button>
      </div>
      <p>{profile === 'demo'
        ? 'Demo progress is separate. Switch back to My progress to see your own work.'
        : 'Demo progress gives you a separate space to practise for a demo.'}</p>
      {profileNotice && <p role="status">{profileNotice}</p>}
      {actionNotice && <p role="status">{actionNotice}</p>}
      <dialog className="pg-reset-dialog" ref={resetDialog} aria-labelledby="pg-reset-title"
        onCancel={event => { if (busy) event.preventDefault() }}>
        <h2 id="pg-reset-title">Clear {profileName}?</h2>
        <p>This clears scores, stars and your streak in this profile. Your saved signs stay. You cannot undo this.</p>
        {resetError && <p role="alert">{resetError}</p>}
        <form method="dialog">
          <button type="submit" disabled={busy}>Keep progress</button>
          <button type="button" disabled={busy} onClick={() => void confirmReset()}>
            {busy ? 'Clearing…' : 'Clear progress'}
          </button>
        </form>
      </dialog>
    </div>
  )

  if (loading) {
    return (
      <section className="pg">
        <StorageNotice storageOk={storageOk} />
        <header className="pg-masthead">
          <div className="pg-masthead-lead">
            <p className="pg-kicker">Your practice</p>
            <h1 className="pg-title">Your Progress</h1>
          </div>
        </header>
      {settings}
        <div className="pg-skeleton" aria-hidden="true">
          <div className="sk sk-band" />
          <div className="sk sk-panel" />
          <div className="sk sk-panel sk-short" />
        </div>
      </section>
    )
  }

  if (total === 0) {
    return (
      <section className="pg">
        <StorageNotice storageOk={storageOk} />
        <header className="pg-masthead">
          <div className="pg-masthead-lead">
            <p className="pg-kicker">Your practice</p>
            <h1 className="pg-title">Your Progress</h1>
          </div>
        </header>
      {settings}
        <div className="pg-notice">
          <h2>No sign data loaded.</h2>
          <p>
            The signs could not load. Please reload the page.
          </p>
        </div>
      </section>
    )
  }

  const started = attemptCount > 0

  return (
    <section className="pg">
      <StorageNotice storageOk={storageOk} />
      <header className="pg-masthead">
        <div className="pg-masthead-lead">
          <p className="pg-kicker">Your practice</p>
          <h1 className="pg-title">Your Progress</h1>
          <p className="pg-sub">
            Your scores and stars stay in this browser. They do not sync with your account.
          </p>
        </div>
        {/* No CTA here on purpose: the per-row "Practise" buttons below are the
            page's action, and "See all signs" already covers the untargeted
            trip to Practice. A third control doing the same thing is noise. */}
      </header>
      {settings}

      <section className="pg-game-stats" aria-label="Stars and daily goal">
        <div><strong>{learned}</strong><span>Signs learned</span><small>2 stars or more · match rewards</small></div>
        <div><strong>{xp(attempts)}</strong><span>Stars earned</span><small>Your best stars for each sign</small></div>
        <div><strong>{dueToday}</strong><span>Review today</span><small>Signs that need another try</small></div>
        <div><strong>{goal.count}/{goal.target}</strong><span>Today's goal</span><small>{goal.met ? 'Goal reached. Great job!' : `${goal.remaining} more tries to go`}</small></div>
      </section>

      {started ? (
        <div className="pg-stats">
          <div className="pg-stat">
            <span className="pg-stat-val">
              {practised}
              <span className="pg-stat-of">/{total}</span>
            </span>
            <span className="pg-stat-lbl">Signs practised</span>
            <div className="pg-stat-track" aria-hidden="true">
              <div className="pg-stat-fill" style={{ width: `${(practised / total) * 100}%` }} />
            </div>
          </div>

          <div className="pg-stat">
            <span className="pg-stat-val">
              {mastered}
              <span className="pg-stat-of">/{total}</span>
            </span>
            <span className="pg-stat-lbl">Mastered</span>
            <div className="pg-stat-track" aria-hidden="true">
              <div className="pg-stat-fill" style={{ width: `${(mastered / total) * 100}%` }} />
            </div>
          </div>

          <div className="pg-stat">
            <span className="pg-stat-val">
              {streak}
              <span className="pg-stat-of">{streak === 1 ? 'day' : 'days'}</span>
            </span>
            <span className="pg-stat-lbl">Goal streak</span>
            <div className="pg-week" aria-hidden="true">
              {week.map((d) => (
                <span
                  key={d.date}
                  className={d.attempts >= DAILY_GOAL ? 'pg-week-dot is-on' : 'pg-week-dot'}
                />
              ))}
            </div>
          </div>

          <div className="pg-stat">
            <span className="pg-stat-val">
              {avgRecent ?? '—'}
              <span className="pg-stat-of">/100</span>
            </span>
            <span className="pg-stat-lbl">Recent match</span>
            <div className="pg-stat-track" aria-hidden="true">
              <div className="pg-stat-fill" style={{ width: `${avgRecent ?? 0}%` }} />
            </div>
          </div>
        </div>
      ) : (
        <div className="pg-notice pg-notice-inline">
          <h2>Nothing logged yet.</h2>
          <p>
            Try a sign to start earning stars. Your progress will show up here.
          </p>
        </div>
      )}

      <div className="pg-grid">
        <div className="pg-col-main">
          <section className="pg-panel" aria-labelledby="pg-focus-h">
            <div className="pg-panel-head">
              <div>
                <p className="pg-kicker">Picked for your next try</p>
                <h2 id="pg-focus-h">Practise next</h2>
              </div>
              {onPractise && (
                <button type="button" className="pg-link" onClick={() => onPractise()}>
                  See all signs
                </button>
              )}
            </div>
            <ol className={`pg-rows${animate ? ' is-animated' : ''}`}>
              {focus.map((s, i) => (
                <SignRow key={s.gloss} s={s} rank={i} animate={animate} stars={starsFor(s.gloss, attempts)} onPractise={onPractise} />
              ))}
            </ol>
          </section>

          {review.length > 0 && (
            <section className="pg-panel" aria-labelledby="pg-review-h">
              <div className="pg-panel-head">
                <div>
                  <p className="pg-kicker">Started, still needs work</p>
                  <h2 id="pg-review-h">Review</h2>
                </div>
              </div>
              <ol className={`pg-rows${animate ? ' is-animated' : ''}`}>
                {review.map((s, i) => (
                  <SignRow key={s.gloss} s={s} rank={i} animate={animate} stars={starsFor(s.gloss, attempts)} onPractise={onPractise} />
                ))}
              </ol>
            </section>
          )}
        </div>

        <aside className="pg-col-rail">
          {started && (
            <section className="pg-panel" aria-labelledby="pg-activity-h">
              <div className="pg-panel-head">
                <div>
                  <p className="pg-kicker">Last {ACTIVITY_DAYS} days</p>
                  <h2 id="pg-activity-h">Your tries</h2>
                </div>
                <span className="pg-panel-figure">
                  {activity.reduce((n, d) => n + d.attempts, 0)}
                  <span> tries</span>
                </span>
              </div>

              <div
                className="pg-heat"
                role="img"
                aria-label={`Practice activity over the last ${ACTIVITY_DAYS} days`}
              >
                {activity.map((d) => {
                  const intensity = d.attempts > 0 ? 0.25 + 0.75 * (d.attempts / peak) : 0
                  return (
                    <div
                      key={d.date}
                      className="pg-heat-day"
                      style={{ '--intensity': intensity } as React.CSSProperties}
                      title={
                        d.attempts === 0
                          ? `${d.date}: no practice`
                          : `${d.date}: ${d.attempts} ${d.attempts === 1 ? 'try' : 'tries'}, avg ${d.avgScore}`
                      }
                    />
                  )
                })}
              </div>

              <div className="pg-heat-key" aria-hidden="true">
                <span>Less</span>
                <i style={{ '--intensity': 0 } as React.CSSProperties} />
                <i style={{ '--intensity': 0.35 } as React.CSSProperties} />
                <i style={{ '--intensity': 0.7 } as React.CSSProperties} />
                <i style={{ '--intensity': 1 } as React.CSSProperties} />
                <span>More</span>
              </div>

              {/* role="img" makes the grid opaque to a screen reader; this is the
                  same 14 days in a form it can read. The wrapper div (not the
                  table) carries .sr-only — clipping a bare table is unreliable. */}
              <div className="sr-only">
                <table>
                  <caption>Practice tries per day, last {ACTIVITY_DAYS} days</caption>
                  <thead>
                    <tr>
                      <th scope="col">Date</th>
                      <th scope="col">Tries</th>
                      <th scope="col">Average score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activity.map((d) => (
                      <tr key={d.date}>
                        <td>{d.date}</td>
                        <td>{d.attempts}</td>
                        <td>{d.avgScore ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {started && coverage.length > 0 && (
            <section className="pg-panel" aria-labelledby="pg-coverage-h">
              <div className="pg-panel-head">
                <div>
                  <p className="pg-kicker">Signs you have tried</p>
                  <h2 id="pg-coverage-h">Your categories</h2>
                </div>
              </div>

              <ul className="pg-cov">
                {visibleCoverage.map((r) => (
                  <li className="pg-cov-row" key={r.cat}>
                    <span className="pg-cov-name">{r.cat}</span>
                    <span className="pg-cov-count">
                      {r.done}
                      <span>/{r.total}</span>
                    </span>
                    <div className="pg-cov-track" aria-hidden="true">
                      <div
                        className="pg-cov-fill"
                        style={{ width: `${(r.done / r.total) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>

              {coverage.length > CATEGORY_PREVIEW && (
                <button
                  type="button"
                  className="pg-link pg-cov-more"
                  onClick={() => setShowAllCategories((v) => !v)}
                >
                  {showAllCategories ? 'Show fewer' : `Show all ${coverage.length} categories`}
                </button>
              )}
            </section>
          )}
        </aside>
      </div>
      <section className="pg-panel pg-units" aria-labelledby="pg-units-h">
        <h2 id="pg-units-h">Learning units</h2>
        {approvedUnits.length === 0 && <p>These units are still being checked. You can keep practising any sign.</p>}
        <details>
          <summary>See the unit plan</summary>
          <ul className="pg-unit-list">
            {CURRICULUM_UNITS.map(unit => {
              const earned = unit.signs.reduce((sum, gloss) => sum + starsFor(gloss, attempts), 0)
              const state = unit.status === 'approved' ? unitState(unit, approvedUnits, attempts) : 'proposed'
              const labels = { proposed: 'Plan preview', locked: 'Later', open: 'Ready', passed: 'Finished', mastered: 'Mastered' }
              return <li key={unit.id}>
                <div><strong>{unit.title}</strong><span>{unit.signs.length} signs · {labels[state]}</span></div>
                <span>{earned}/{unit.signs.length * 3} stars</span>
              </li>
            })}
          </ul>
        </details>
      </section>
      <section className="pg-panel pg-explainers" aria-label="About your progress">
        <details>
          <summary>How we pick your next sign</summary>
          <p>When you tap Next, a sign that needs another try comes first. If none needs review, you get a new sign.</p>
          <p>A short session mixes two signs to review with one new sign, when both are available.</p>
          <p>Your match scores and time since practice help choose what comes next. These are simple rules. They do not prove that you know a sign.</p>
        </details>
        <details>
          <summary>How scores and stars work</summary>
          <p>A score compares your hands with one saved sign. It measures a match, not whether your sign is correct.</p>
          <p>85–100: {band(85).label}. 60–84: {band(60).label}. Below 60: {band(0).label}.</p>
          <p>In Try, {TRY_FIRST_STAR} earns one star and {TRY_SECOND_STAR} earns two. After two stars, Recall (try from memory) can earn a third with a score of {RECALL_THIRD_STAR} or more, without showing the sign first.</p>
          <p>Finish a unit by earning at least one star on each sign. Stars are match rewards. They do not prove that a sign is correct.</p>
          <p>The match history estimate uses your scores, with newer tries counting more. Mastered means at least three tries and an estimate of 85 or more. It is a label for your match history.</p>
          <p>Do {DAILY_GOAL} scored tries in a day to meet your goal. Your goal streak counts days in a row when you met that goal.</p>
        </details>
      </section>
    </section>
  )
}
