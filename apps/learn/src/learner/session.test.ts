import { afterEach, describe, expect, it, vi } from 'vitest'
import { summarizeAll, suggestNext } from './mastery'
import type { AttemptLogEntry } from './attemptLog'
import {
  buildSession,
  buildSessionPlan,
  clearSession,
  currentGloss,
  currentRecommendation,
  isComplete,
  loadSession,
  markAttempted,
  startSession,
  startUnitSession,
  saveSession,
} from './session'
import type { CurriculumUnit } from '../data/curriculum'

afterEach(() => vi.unstubAllGlobals())

const NOW = new Date('2026-08-18T10:00:00.000Z')

function attempt(gloss: string, score: number, daysAgo = 0): AttemptLogEntry {
  const at = new Date(NOW.getTime() - daysAgo * 86_400_000)
  return {
    id: `${gloss}-${score}-${daysAgo}`,
    gloss,
    referenceId: 'ref',
    score,
    worstFingers: [],
    createdAt: at.toISOString(),
  }
}

const VOCAB = ['ALPHA', 'BRAVO', 'CHARLIE', 'DELTA', 'ECHO', 'FOXTROT', 'GOLF']

describe('buildSession', () => {
  it('agrees with suggestNext on the first sign', () => {
    // Without a category lookup a session is exactly the policy that produced
    // the single suggestion, extended to N. The UI feeds both from buildSession
    // so the learner is never told one thing and given another.
    const log = [attempt('ALPHA', 90, 0), attempt('BRAVO', 20, 3), attempt('CHARLIE', 55, 1)]
    const summaries = summarizeAll(VOCAB, log)
    expect(buildSession(summaries, 5, NOW)[0]).toBe(suggestNext(summaries, NOW))
  })

  it('returns the requested number of signs, without repeats', () => {
    const summaries = summarizeAll(VOCAB, [])
    const built = buildSession(summaries, 5, NOW)
    expect(built).toHaveLength(5)
    expect(new Set(built).size).toBe(5)
  })

  it('never asks for more signs than the vocabulary holds', () => {
    const summaries = summarizeAll(['ONE', 'TWO'], [])
    expect(buildSession(summaries, 5, NOW)).toHaveLength(2)
  })

  it('puts the weakest signs first and leaves mastered ones out', () => {
    const log = [
      // Mastered: three strong attempts, practised today.
      attempt('ALPHA', 95, 0),
      attempt('ALPHA', 92, 0),
      attempt('ALPHA', 96, 0),
      // Struggling.
      attempt('BRAVO', 15, 0),
    ]
    // Only these two have history; the rest are new and take priority anyway.
    const summaries = summarizeAll(['ALPHA', 'BRAVO'], log)
    expect(buildSession(summaries, 1, NOW)).toEqual(['BRAVO'])
  })
})

describe('buildSession category spread', () => {
  // Mirrors the real corpus shape: alphabetically, numbers come first, so a
  // learner with no history used to get five of them in a row.
  const CORPUS: Record<string, string> = {
    '1': 'Numbers',
    '100': 'Numbers',
    '1000': 'Numbers',
    '10000': 'Numbers',
    ALPHA: 'Verbs',
    BRAVO: 'Verbs',
    RED: 'Colors',
    MONDAY: 'Days',
    HELLO: 'Greetings',
  }
  const catOf = (g: string) => CORPUS[g] ?? 'Other'
  const all = Object.keys(CORPUS)

  it('opens a first session on a word, not a numeral', () => {
    // The point of the whole exercise: with no history every sign ties at 1.0,
    // and alphabetically that means a participant's very first sign is "1".
    const summaries = summarizeAll(all, [])
    const built = buildSession(summaries, 5, NOW, catOf)
    expect(['Numbers', 'A-Z']).not.toContain(catOf(built[0]))
  })

  it('fills a first session with words, spread across categories', () => {
    const summaries = summarizeAll(all, [])
    const built = buildSession(summaries, 5, NOW, catOf)
    const cats = built.map(catOf)
    // Every word in the corpus is offered before any numeral is.
    expect(cats).not.toContain('Numbers')
    // And they are not all drawn from one category either.
    expect(new Set(cats).size).toBeGreaterThanOrEqual(4)
  })

  it('falls back to symbols once the words run out', () => {
    const summaries = summarizeAll(all, [])
    // Only four word signs exist here, so a session of six must reach for one.
    const built = buildSession(summaries, 6, NOW, catOf)
    expect(built.map(catOf)).toContain('Numbers')
  })

  it('never trades a genuinely weaker sign for variety', () => {
    // BRAVO is badly wrong and shares a category with ALPHA. Variety must not
    // promote a well-practised sign from a fresh category above it.
    const log = [
      attempt('BRAVO', 5, 0),
      attempt('RED', 95, 0),
      attempt('RED', 95, 0),
      attempt('RED', 95, 0),
    ]
    const summaries = summarizeAll(['ALPHA', 'BRAVO', 'RED'], log)
    const built = buildSession(summaries, 2, NOW, catOf)
    expect(built).toContain('BRAVO')
    expect(built).not.toContain('RED')
  })

  it('is unchanged when no category lookup is supplied', () => {
    const summaries = summarizeAll(all, [])
    expect(buildSession(summaries, 5, NOW)).toEqual(['1', '100', '1000', '10000', 'ALPHA'])
  })
})

describe('session progress', () => {
  const summaries = summarizeAll(VOCAB, [])

  it('starts with nothing done and the first sign current', () => {
    const s = startSession(summaries, 3, NOW)
    expect(s.done).toEqual([])
    expect(currentGloss(s)).toBe(s.glosses[0])
    expect(isComplete(s)).toBe(false)
  })

  it('captures the mastery each sign started at, for the completion delta', () => {
    const log = [attempt('ALPHA', 80, 0)]
    const withHistory = summarizeAll(VOCAB, log)
    const s = startSession(withHistory, 7, NOW)
    expect(Object.keys(s.startMastery).sort()).toEqual([...s.glosses].sort())
    expect(s.startMastery.ALPHA).toBeCloseTo(0.8, 5)
  })

  it('completes after one attempt per sign, whatever the score', () => {
    // The bound that matters: a beginner scoring 3 must still be able to finish.
    let s = startSession(summaries, 3, NOW)
    for (const g of s.glosses) s = markAttempted(s, g)
    expect(isComplete(s)).toBe(true)
    expect(currentGloss(s)).toBeNull()
  })

  it('counts a session sign practised out of order', () => {
    const s = startSession(summaries, 3, NOW)
    const last = s.glosses[2]
    const after = markAttempted(s, last)
    expect(after.done).toContain(last)
    expect(currentGloss(after)).toBe(s.glosses[0])
  })

  it('ignores signs outside the session and never double-counts', () => {
    const s = startSession(summaries, 3, NOW)
    expect(markAttempted(s, 'NOT_IN_SESSION')).toBe(s)
    const once = markAttempted(s, s.glosses[0])
    expect(markAttempted(once, s.glosses[0])).toBe(once)
  })
})

describe('finite review/new mix and Path API', () => {
  const vocab = ['R1_FIXTURE', 'R2_FIXTURE', 'R3_FIXTURE', 'R4_FIXTURE', 'N1_FIXTURE', 'N2_FIXTURE', 'OTHER_FIXTURE']
  const log = [attempt('R1_FIXTURE', 0), attempt('R2_FIXTURE', 10), attempt('R3_FIXTURE', 20), attempt('R4_FIXTURE', 30)]
  const summaries = summarizeAll(vocab, log)
  it('makes the existing Practice one-item selection revisit score 30 before a new sign', () => {
    const all = summarizeAll(['WEAK_FIXTURE', 'NEW_FIXTURE'], [attempt('WEAK_FIXTURE', 30)])
    expect(buildSession(all, 1, NOW, () => 'Other')).toEqual(['WEAK_FIXTURE'])
  })
  it('interleaves two distinct due reviews with one new sign and captures reasons', () => {
    const plan = buildSessionPlan(summaries, 6, NOW, undefined, ['N2_FIXTURE', 'N1_FIXTURE'])
    expect(plan.map((item) => item.kind)).toEqual(['review', 'review', 'new', 'review', 'review', 'new'])
    expect(plan.map((item) => item.gloss)).toEqual(['R1_FIXTURE', 'R2_FIXTURE', 'N2_FIXTURE', 'R3_FIXTURE', 'R4_FIXTURE', 'N1_FIXTURE'])
    expect(plan[0].reason).toBe('review: low match score')
    expect(plan[2].reason).toBe('new: next in unit')
  })
  it('drains available queues without repeats, then fills with attempted non-due practice', () => {
    const all = summarizeAll(['R_FIXTURE', 'NEW_FIXTURE', 'FRESH_FIXTURE'],
      [attempt('R_FIXTURE', 30), attempt('FRESH_FIXTURE', 95)])
    expect(buildSessionPlan([...all, all[0]], 8, NOW).map((item) => item.kind)).toEqual(['review', 'new', 'practice'])
    expect(buildSession(all, 8, NOW)).toHaveLength(3)
    expect(buildSession([], 8, NOW)).toEqual([])
    for (const size of [0, -1, NaN, Infinity]) expect(buildSession(all, size, NOW)).toEqual([])
    expect(buildSession(all, 1.5, NOW)).toHaveLength(1)
  })
  it('preserves curriculum new-sign order even when category preferences would reorder it', () => {
    const all = summarizeAll(['1', 'WORD_FIXTURE'], [])
    expect(buildSession(all, 2, NOW, (gloss) => gloss === '1' ? 'Numbers' : 'Other', ['1', 'WORD_FIXTURE']))
      .toEqual(['1', 'WORD_FIXTURE'])
    const practised = summarizeAll(['UNIT_FIXTURE', 'OUTSIDE_FIXTURE'],
      [attempt('UNIT_FIXTURE', 95), attempt('OUTSIDE_FIXTURE', 80)])
    expect(buildSession(practised, 8, NOW, undefined, ['UNIT_FIXTURE'])).toEqual(['UNIT_FIXTURE'])
  })
  it('starts a review-aware unit session only for approved, available curriculum', () => {
    const unit: CurriculumUnit = { id: 'fixture-unit', title: 'Fixture', description: 'Control fixture only',
      status: 'approved', signs: ['N2_FIXTURE', 'N1_FIXTURE'] }
    const session = startUnitSession(unit, summaries, NOW)
    expect(session.unitId).toBe(unit.id)
    expect(session.glosses).not.toContain('OTHER_FIXTURE')
    expect(currentRecommendation(session)).toMatchObject({ gloss: session.glosses[0], kind: 'review' })
    expect(Object.keys(session.startMastery).sort()).toEqual([...session.glosses].sort())
    expect(() => startUnitSession({ ...unit, status: 'proposed' }, summaries, NOW)).toThrow('approval')
    expect(() => startUnitSession({ ...unit, signs: [] }, summaries, NOW)).toThrow('needs signs')
    expect(() => startUnitSession(unit, summaries, NOW, 0)).toThrow('positive size')
    expect(() => startUnitSession({ ...unit, signs: ['MISSING_FIXTURE'] }, summaries, NOW)).toThrow('not loaded')
    const old = { ...session, recommendations: undefined }
    expect(currentRecommendation(old)).toBeNull()
    expect(currentRecommendation({ ...session, done: [...session.glosses] })).toBeNull()
  })
  it('round-trips new recommendation metadata and older saved sessions safely', () => {
    const storage = new Map<string, string>()
    vi.stubGlobal('window', { sessionStorage: { getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) } })
    expect(loadSession()).toBeNull()
    const session = startSession(summaries, 3, NOW)
    saveSession(session)
    expect(loadSession()).toEqual(session)
    saveSession({ ...session, recommendations: undefined })
    expect(loadSession()?.recommendations).toBeUndefined()
    storage.set('ssl-learn-session', '{bad json')
    expect(loadSession()).toBeNull()
    storage.set('ssl-learn-session', JSON.stringify({ ...session, recommendations: [{ kind: 'bad' }] }))
    expect(loadSession()).toBeNull()
    clearSession()
    expect(storage.size).toBe(0)
  })
})
