import { useEffect, useState } from 'react'
import { listAttempts } from '../learner/attemptLog'
import { currentStreak, dailyActivity } from '../learner/activity'
import type { DayBucket } from '../learner/activity'
import { practiceNeed, summarizeAll } from '../learner/mastery'
import type { GlossMastery, MasteryLevel } from '../learner/mastery'
import { glossLabel } from '../data/translations'
import { listRecordings } from '../storage/recordingStore'
import { loadReferenceIndex } from '../storage/bundledReferences'

/** Days of history in the activity strip. Two weeks fits a phone without
 *  scrolling and is long enough for a habit to be visible in it. */
const ACTIVITY_DAYS = 14

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

/** Tiny trend line of recent scores (0–100). Values are in the row as text;
 *  this is redundant visual encoding, so it stays minimal by design. */
function Sparkline({ scores }: { scores: number[] }) {
  if (scores.length < 2) return null
  const w = 72
  const h = 24
  const pad = 3
  const step = (w - pad * 2) / (scores.length - 1)
  const points = scores
    .map(
      (s, i) =>
        `${(pad + i * step).toFixed(1)},${(h - pad - (s / 100) * (h - pad * 2)).toFixed(1)}`,
    )
    .join(' ')
  return (
    <svg
      className="sparkline"
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      role="img"
      aria-label={`Recent scores: ${scores.join(', ')}`}
    >
      <title>{`Recent scores: ${scores.join(' → ')}`}</title>
      <polyline points={points} />
    </svg>
  )
}

/**
 * Mastery dashboard: summary tiles + per-sign progress, weakest first.
 *
 * The learner's own results only. Pilot export and the feedback-latency panel
 * moved to the author-only Study tab — they are the researcher's instruments,
 * and a participant met them here while looking at their own learning.
 */
export function ProgressView() {
  const [summaries, setSummaries] = useState<GlossMastery[]>([])
  const [attemptCount, setAttemptCount] = useState(0)
  const [avgRecent, setAvgRecent] = useState<number | null>(null)
  const [activity, setActivity] = useState<DayBucket[]>([])
  const [streak, setStreak] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    void (async () => {
      // Only the gloss names are needed here, so this never touches frames.
      const [loc, bun, log] = await Promise.all([
        listRecordings(),
        loadReferenceIndex(),
        listAttempts(),
      ])
      const glosses = [...loc, ...bun].map((r) => r.gloss)
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

  // Only signs the learner has actually attempted, unless they ask for the rest.
  // The full vocabulary is 358 rows, almost all of them "no attempts yet · 0%",
  // which buries the handful of rows that say anything about their progress.
  const attempted = summaries.filter((s) => s.attempts > 0)
  const untouched = summaries.length - attempted.length
  const shown = showAll ? summaries : attempted

  return (
    <section className="library-card">
      <div className="library-head">
        <h2>Progress</h2>
        <span className="library-count">sorted by what needs practice</span>
      </div>

      {loading ? (
        <p className="empty-state">Loading…</p>
      ) : summaries.length === 0 ? (
        <p className="empty-state">
          No vocabulary yet — record reference signs in the <strong>Record</strong> tab first.
        </p>
      ) : (
        <>
          <div className="stat-tiles">
            <div className="stat-tile">
              <span className="stat-value">
                {practised}
                <em>/{summaries.length}</em>
              </span>
              <span className="stat-label">signs practised</span>
            </div>
            <div className="stat-tile">
              <span className="stat-value">{attemptCount}</span>
              <span className="stat-label">total attempts</span>
            </div>
            <div className="stat-tile">
              <span className="stat-value">{avgRecent ?? '—'}</span>
              <span className="stat-label">avg of last 10 scores</span>
            </div>
            <div className="stat-tile">
              <span className="stat-value">{mastered}</span>
              <span className="stat-label">signs mastered</span>
            </div>
            <div className="stat-tile">
              <span className="stat-value">{streak}</span>
              <span className="stat-label">
                {streak === 1 ? 'day streak' : 'day practice streak'}
              </span>
            </div>
          </div>

          {attemptCount > 0 && (
            /* Mastery says how well; this says how often. For a module whose
               research question is a gain measured across sessions, showing up
               is half the story — and it is the half a learner controls. */
            <div className="activity-block">
              <div className="activity-head">
                <p className="pane-label">Last {ACTIVITY_DAYS} days</p>
                <span className="activity-total">
                  {activity.reduce((n, d) => n + d.attempts, 0)} attempts
                </span>
              </div>
              <ol
                className="activity-chart"
                role="img"
                aria-label={`Practice over the last ${ACTIVITY_DAYS} days: ${
                  activity.filter((d) => d.attempts > 0).length
                } days practised, ${activity.reduce((n, d) => n + d.attempts, 0)} attempts in total.`}
              >
                {activity.map((d) => {
                  const peak = Math.max(...activity.map((x) => x.attempts), 1)
                  return (
                    <li
                      key={d.date}
                      className={d.attempts > 0 ? 'activity-day on' : 'activity-day'}
                      // Bars are scaled against the busiest day rather than a
                      // fixed ceiling, so the shape of a light week is still
                      // readable instead of a row of slivers.
                      style={{ '--fill': `${(d.attempts / peak) * 100}%` } as React.CSSProperties}
                      title={
                        d.attempts === 0
                          ? `${d.date}: no practice`
                          : `${d.date}: ${d.attempts} attempt${d.attempts === 1 ? '' : 's'}, average ${d.avgScore}`
                      }
                    >
                      <span />
                    </li>
                  )
                })}
              </ol>
            </div>
          )}

          {attemptCount === 0 ? (
            <p className="empty-state">
              Your progress appears here after your first scored attempt in the{' '}
              <strong>Practice</strong> tab.
            </p>
          ) : (
            <ul className="mastery-list">
              {shown.map((s) => (
                <li className="mastery-row" key={s.gloss}>
                  {/* The meaning alongside the gloss, as everywhere else —
                      a bare label is not something a learner can act on. */}
                  <span className="rec-gloss">{glossLabel(s.gloss)}</span>
                  <span className={`level-chip ${s.level}`}>{LEVEL_LABEL[s.level]}</span>
                  <div className="mastery-bar" title={`Mastery ${(s.mastery * 100).toFixed(0)}%`}>
                    <div style={{ width: `${Math.round(s.mastery * 100)}%` }} />
                  </div>
                  <span className="mastery-pct">{Math.round(s.mastery * 100)}%</span>
                  <Sparkline scores={s.recentScores} />
                  <span className="mastery-meta">
                    {s.attempts === 0
                      ? 'no attempts yet'
                      : `${s.attempts} attempt${s.attempts === 1 ? '' : 's'} · last ${relativeDay(s.lastPracticedAt)}`}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {attemptCount > 0 && untouched > 0 && (
            <button className="link-button" onClick={() => setShowAll((v) => !v)}>
              {showAll
                ? `Show only the ${attempted.length} I've practised`
                : `Show all ${summaries.length} signs (${untouched} not started)`}
            </button>
          )}
        </>
      )}
    </section>
  )
}
