import { useEffect, useState, useMemo } from 'react'
import { listAttempts } from '../learner/attemptLog'
import { currentStreak, dailyActivity } from '../learner/activity'
import type { DayBucket } from '../learner/activity'
import { practiceNeed, summarizeAll } from '../learner/mastery'
import type { GlossMastery, MasteryLevel } from '../learner/mastery'
import { buildSession } from '../learner/session'
import { translationOf } from '../data/translations'
import { listRecordings } from '../storage/recordingStore'
import { loadReferenceIndex } from '../storage/bundledReferences'
import { pickReferenceList } from '../storage/references'
import { toMeta } from '../vision/types'
import { categoryOf, categoriesIn } from '../data/categories'

const ACTIVITY_DAYS = 14
// The full catalogue is Practice's job. Progress shows only what the learner
// model rates as most worth doing now, plus a breadth read on the categories.
const FOCUS_COUNT = 6
const REVIEW_COUNT = 5
// A practised sign needs real outstanding work before it earns a Review slot —
// otherwise a sign drilled yesterday shows up asking to be redone.
const REVIEW_NEED_MIN = 0.3
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
  onPractise,
}: {
  s: GlossMastery
  rank: number
  animate: boolean
  onPractise?: (gloss?: string) => void
}) {
  const meaning = translationOf(s.gloss)
  const pct = Math.round(s.mastery * 100)
  const meta =
    s.attempts === 0
      ? 'Not practised yet'
      : `${s.attempts} attempt${s.attempts === 1 ? '' : 's'} · ${relativeDay(s.lastPracticedAt)}`

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
        <p className="pg-row-meta">{meta}</p>
      </div>

      <div className="pg-row-meter">
        <div className={`pg-meter is-${s.level}`} aria-hidden="true">
          <div className="pg-meter-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="pg-meter-val">{pct}%</span>
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
  const [categoryMap, setCategoryMap] = useState<Map<string, string>>(new Map())
  const [availableCategories, setAvailableCategories] = useState<string[]>([])

  const [attemptCount, setAttemptCount] = useState(0)
  const [avgRecent, setAvgRecent] = useState<number | null>(null)
  const [activity, setActivity] = useState<DayBucket[]>([])
  const [streak, setStreak] = useState(0)
  const [loading, setLoading] = useState(true)

  const [showAllCategories, setShowAllCategories] = useState(false)

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
    void (async () => {
      const [loc, bun, log] = await Promise.all([
        listRecordings(),
        loadReferenceIndex(),
        listAttempts(),
      ])
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
      setStreak(currentStreak(log, now))
      const recent = log.slice(-10)
      setAvgRecent(
        recent.length > 0
          ? Math.round(recent.reduce((acc, e) => acc + e.score, 0) / recent.length)
          : null,
      )
      setLoading(false)
    })()
  }, [])

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
        (s) => s.attempts > 0 && !inFocus.has(s.gloss) && practiceNeed(s, now) >= REVIEW_NEED_MIN,
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

  if (loading) {
    return (
      <section className="pg">
        <header className="pg-masthead">
          <div className="pg-masthead-lead">
            <p className="pg-kicker">Learner dashboard</p>
            <h1 className="pg-title">Your Progress</h1>
          </div>
        </header>
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
        <header className="pg-masthead">
          <div className="pg-masthead-lead">
            <p className="pg-kicker">Learner dashboard</p>
            <h1 className="pg-title">Your Progress</h1>
          </div>
        </header>
        <div className="pg-notice">
          <h2>No sign data loaded.</h2>
          <p>
            The reference recordings did not load, so there is nothing to track yet. A reload
            usually fixes it.
          </p>
        </div>
      </section>
    )
  }

  const started = attemptCount > 0

  return (
    <section className="pg">
      <header className="pg-masthead">
        <div className="pg-masthead-lead">
          <p className="pg-kicker">Learner dashboard</p>
          <h1 className="pg-title">Your Progress</h1>
          <p className="pg-sub">
            Every attempt is scored against a real-signer recording and logged in this browser.
          </p>
        </div>
        {/* No CTA here on purpose: the per-row "Practise" buttons below are the
            page's action, and "See all signs" already covers the untargeted
            trip to Practice. A third control doing the same thing is noise. */}
      </header>

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
            <span className="pg-stat-lbl">Fully mastered</span>
            <div className="pg-stat-track" aria-hidden="true">
              <div className="pg-stat-fill" style={{ width: `${(mastered / total) * 100}%` }} />
            </div>
          </div>

          <div className="pg-stat">
            <span className="pg-stat-val">
              {streak}
              <span className="pg-stat-of">{streak === 1 ? 'day' : 'days'}</span>
            </span>
            <span className="pg-stat-lbl">Current streak</span>
            <div className="pg-week" aria-hidden="true">
              {week.map((d) => (
                <span
                  key={d.date}
                  className={d.attempts > 0 ? 'pg-week-dot is-on' : 'pg-week-dot'}
                />
              ))}
            </div>
          </div>

          <div className="pg-stat">
            <span className="pg-stat-val">
              {avgRecent ?? '—'}
              <span className="pg-stat-of">/100</span>
            </span>
            <span className="pg-stat-lbl">Recent average</span>
            <div className="pg-stat-track" aria-hidden="true">
              <div className="pg-stat-fill" style={{ width: `${avgRecent ?? 0}%` }} />
            </div>
          </div>
        </div>
      ) : (
        <div className="pg-notice pg-notice-inline">
          <h2>Nothing logged yet.</h2>
          <p>
            Practise a sign and this page fills in — a mastery estimate for every sign, a daily
            streak, and an activity record.
          </p>
        </div>
      )}

      <div className="pg-grid">
        <div className="pg-col-main">
          <section className="pg-panel" aria-labelledby="pg-focus-h">
            <div className="pg-panel-head">
              <div>
                <p className="pg-kicker">Ranked by the learner model</p>
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
                <SignRow key={s.gloss} s={s} rank={i} animate={animate} onPractise={onPractise} />
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
                  <SignRow key={s.gloss} s={s} rank={i} animate={animate} onPractise={onPractise} />
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
                  <h2 id="pg-activity-h">Activity</h2>
                </div>
                <span className="pg-panel-figure">
                  {activity.reduce((n, d) => n + d.attempts, 0)}
                  <span> attempts</span>
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
                          : `${d.date}: ${d.attempts} attempt${d.attempts === 1 ? '' : 's'}, avg ${d.avgScore}`
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
                  <caption>Practice attempts per day, last {ACTIVITY_DAYS} days</caption>
                  <thead>
                    <tr>
                      <th scope="col">Date</th>
                      <th scope="col">Attempts</th>
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
                  <p className="pg-kicker">Breadth across the corpus</p>
                  <h2 id="pg-coverage-h">Coverage</h2>
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
    </section>
  )
}
