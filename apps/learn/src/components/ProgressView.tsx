import { useEffect, useState, useMemo } from 'react'
import { listAttempts } from '../learner/attemptLog'
import { currentStreak, dailyActivity } from '../learner/activity'
import type { DayBucket } from '../learner/activity'
import { practiceNeed, summarizeAll } from '../learner/mastery'
import type { GlossMastery, MasteryLevel } from '../learner/mastery'
import { glossLabel } from '../data/translations'
import { listRecordings } from '../storage/recordingStore'
import { loadReferenceIndex } from '../storage/bundledReferences'
import { categoryOf, categoriesIn } from '../data/categories'

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

export function ProgressView() {
  const [summaries, setSummaries] = useState<GlossMastery[]>([])
  const [categoryMap, setCategoryMap] = useState<Map<string, string>>(new Map())
  const [availableCategories, setAvailableCategories] = useState<string[]>([])
  
  const [attemptCount, setAttemptCount] = useState(0)
  const [avgRecent, setAvgRecent] = useState<number | null>(null)
  const [activity, setActivity] = useState<DayBucket[]>([])
  const [streak, setStreak] = useState(0)
  const [loading, setLoading] = useState(true)
  
  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      const [loc, bun, log] = await Promise.all([
        listRecordings(),
        loadReferenceIndex(),
        listAttempts(),
      ])
      const allRefs = [...loc, ...bun]
      const glosses = allRefs.map((r) => r.gloss)
      
      const cMap = new Map<string, string>()
      for (const r of allRefs) {
          cMap.set(r.gloss, categoryOf(r))
      }
      setCategoryMap(cMap)
      setAvailableCategories(categoriesIn(allRefs))

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
  const overallMastery = summaries.length > 0 ? (practised / summaries.length) * 100 : 0
  const cScore = Math.max(0, 100 - overallMastery)

  // Filter summaries based on search query
  const filteredSummaries = useMemo(() => {
    if (!searchQuery) return summaries
    const lowerQ = searchQuery.toLowerCase()
    return summaries.filter(s => glossLabel(s.gloss).toLowerCase().includes(lowerQ))
  }, [summaries, searchQuery])

  // Group by category
  const summariesByCategory = useMemo(() => {
    const grouped = new Map<string, GlossMastery[]>()
    for (const cat of availableCategories) {
        grouped.set(cat, [])
    }
    grouped.set('Other', [])
    
    for (const s of filteredSummaries) {
        const cat = categoryMap.get(s.gloss) || 'Other'
        if (grouped.has(cat)) {
            grouped.get(cat)!.push(s)
        } else {
            grouped.set(cat, [s])
        }
    }
    return grouped
  }, [filteredSummaries, availableCategories, categoryMap])

  return (
    <section className="aww-progress-view">
      <div className="aww-progress-header">
        <h1 className="aww-progress-title">Your Progress</h1>
      </div>

      {loading ? (
        <p className="empty-state">Loading…</p>
      ) : summaries.length === 0 ? (
        <p className="empty-state">
          No vocabulary yet — record reference signs in the <strong>Record</strong> tab first.
        </p>
      ) : (
        <div className="aww-progress-content">
          
          {/* 1. Bento Box Analytics Header */}
          <div className="aww-bento-grid">
            
            {/* Mastery Ring */}
            <div className="aww-bento-card aww-bento-mastery">
              <h3>Overall Mastery</h3>
              <div className="aww-radial-progress" style={{ '--progress': `${overallMastery}%` } as React.CSSProperties}>
                 <svg viewBox="0 0 120 120">
                   <circle cx="60" cy="60" r="54" className="bg" />
                   <circle cx="60" cy="60" r="54" className="fg" strokeDasharray="339.29" strokeDashoffset={339.29 * (cScore / 100)} />
                 </svg>
                 <div className="aww-radial-content">
                   <span className="val">{practised}</span>
                   <span className="lbl">/ {summaries.length}</span>
                 </div>
              </div>
              <p>{mastered} signs fully mastered</p>
            </div>

            {/* Stats Column */}
            <div className="aww-bento-stats-col">
               <div className="aww-bento-card aww-bento-streak">
                 <h3>Current Streak</h3>
                 <div className="aww-streak-display">
                    <span className="streak-fire">🔥</span>
                    <span className="streak-val">{streak}</span>
                    <span className="streak-lbl">Days</span>
                 </div>
               </div>
               
               <div className="aww-bento-card aww-bento-avg">
                 <h3>Recent Average</h3>
                 <div className="aww-avg-display">
                    <span className="avg-val">{avgRecent ?? '—'}</span>
                    <span className="avg-lbl">/ 100</span>
                 </div>
                 <p className="stat-sub">Based on last 10 attempts</p>
               </div>
            </div>

            {/* Activity Heatmap */}
            {attemptCount > 0 && (
                <div className="aww-bento-card aww-bento-activity">
                  <div className="activity-header-flex">
                    <h3>Activity Heatmap</h3>
                    <span className="activity-total">{activity.reduce((n, d) => n + d.attempts, 0)} attempts</span>
                  </div>
                  <p className="stat-sub" style={{marginBottom: '16px'}}>Last {ACTIVITY_DAYS} days</p>
                  
                  <div className="aww-heatmap" role="img" aria-label="Activity heatmap">
                    {activity.map((d) => {
                      const peak = Math.max(...activity.map((x) => x.attempts), 1)
                      const intensity = d.attempts > 0 ? 0.2 + (0.8 * (d.attempts / peak)) : 0
                      return (
                        <div
                          key={d.date}
                          className="aww-heatmap-day"
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
                </div>
            )}
          </div>

          {/* 2. The Command Center (Sign Browser) */}
          <div className="aww-command-center">
            <div className="aww-command-header">
               <h2>Sign Library</h2>
               <div className="aww-search-bar">
                 <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                 <input 
                   type="text" 
                   placeholder="Search 490 signs..." 
                   value={searchQuery}
                   onChange={e => setSearchQuery(e.target.value)}
                 />
               </div>
            </div>

            {/* Accordions */}
            <div className="aww-accordions">
               {availableCategories.map(cat => {
                   const items = summariesByCategory.get(cat) || []
                   if (items.length === 0) return null
                   
                   const isExpanded = expandedCategory === cat || (searchQuery !== '' && items.length > 0)
                   
                   const categoryPractised = items.filter(s => s.attempts > 0).length
                   const categoryProgress = (categoryPractised / items.length) * 100
                   
                   return (
                     <div className={`aww-accordion ${isExpanded ? 'expanded' : ''}`} key={cat}>
                       <button className="aww-accordion-header" onClick={() => setExpandedCategory(isExpanded ? null : cat)}>
                         <div className="cat-info">
                            <h3>{cat}</h3>
                            <span className="cat-count">{categoryPractised} / {items.length} practised</span>
                         </div>
                         <div className="cat-progress-bar">
                            <div className="cat-progress-fill" style={{width: `${categoryProgress}%`}}></div>
                         </div>
                         <svg className="chevron" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                       </button>
                       
                       {isExpanded && (
                         <div className="aww-accordion-content">
                            <div className="aww-sign-grid">
                              {items.map(s => (
                                <div className={`aww-sign-card ${s.level}`} key={s.gloss}>
                                  <div className="sign-card-header">
                                    <h4>{glossLabel(s.gloss)}</h4>
                                    <span className={`level-chip ${s.level}`}>{LEVEL_LABEL[s.level]}</span>
                                  </div>
                                  
                                  <div className="sign-card-body">
                                    <div className="progress-ring-mini" style={{'--pct': `${s.mastery * 100}%`} as React.CSSProperties}>
                                      <svg viewBox="0 0 36 36">
                                        <circle cx="18" cy="18" r="16" className="bg" />
                                        <circle cx="18" cy="18" r="16" className="fg" strokeDasharray="100.53" strokeDashoffset={100.53 * (1 - s.mastery)} />
                                      </svg>
                                      <span>{Math.round(s.mastery * 100)}%</span>
                                    </div>
                                    
                                    <div className="sign-card-stats">
                                      <span className="attempts-text">
                                        {s.attempts === 0 ? 'Not started' : `${s.attempts} attempt${s.attempts === 1 ? '' : 's'}`}
                                      </span>
                                      <span className="last-practised">
                                        {s.attempts === 0 ? '' : `Last: ${relativeDay(s.lastPracticedAt)}`}
                                      </span>
                                    </div>
                                    
                                    <div className="spark-wrap">
                                      <Sparkline scores={s.recentScores} />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                         </div>
                       )}
                     </div>
                   )
               })}
               
               {filteredSummaries.length === 0 && (
                   <div className="aww-no-results">
                      <p>No signs found matching "{searchQuery}"</p>
                   </div>
               )}
            </div>
          </div>
          
        </div>
      )}
    </section>
  )
}
