import { describe, expect, it } from 'vitest'
import { buildExport, toCsv } from './exportResults'
import type { AttemptLogEntry } from '../learner/attemptLog'
import type { LatencySample } from '../metrics/latency'

let n = 0
function attempt(gloss: string, score: number, createdAt: string): AttemptLogEntry {
  return { id: `a${n++}`, gloss, referenceId: `ref-${gloss}`, score, worstFingers: [], createdAt }
}

const ATTEMPTS = [
  attempt('KANAWA', 40, '2026-08-06T10:00:00.000Z'),
  attempt('BONAWA', 55, '2026-08-06T10:01:00.000Z'),
  attempt('KANAWA', 80, '2026-08-06T10:02:00.000Z'),
]

function latencyFor(a: AttemptLogEntry, totalMs: number): LatencySample {
  return {
    id: a.id,
    source: 'practice',
    gloss: a.gloss,
    trackingMs: 20,
    scoringMs: 30,
    renderMs: totalMs - 50,
    totalMs,
    frameCount: 90,
    createdAt: a.createdAt,
  }
}

describe('session segmentation', () => {
  // The proposal's learning-gain target is phrased "after 10 sessions", so the
  // export has to be able to count them and split scores by sitting.
  const SESSIONED: AttemptLogEntry[] = [
    { ...attempt('KANAWA', 30, '2026-08-06T10:00:00.000Z'), sessionId: 's1' },
    { ...attempt('BONAWA', 35, '2026-08-06T10:01:00.000Z'), sessionId: 's1' },
    { ...attempt('KANAWA', 70, '2026-08-07T10:00:00.000Z'), sessionId: 's2' },
    // Free practice: no session, and must not inflate the count.
    attempt('KANAWA', 66, '2026-08-07T11:00:00.000Z'),
  ]

  it('counts distinct sessions, ignoring free practice', () => {
    expect(buildExport('P01', SESSIONED).totals.sessions).toBe(2)
  })

  it('reports zero sessions when every attempt was free practice', () => {
    expect(buildExport('P01', ATTEMPTS).totals.sessions).toBe(0)
  })

  it('carries the session id per row, blank where there was none', () => {
    const rows = toCsv(buildExport('P01', SESSIONED)).trim().split('\n').slice(1)
    const sessionCol = rows.map((r) => r.split(',')[6])
    expect(sessionCol).toEqual(['s1', 's1', 's2', ''])
  })

  it('keeps scores splittable by session for a gain measure', () => {
    const data = buildExport('P01', SESSIONED)
    const bySession = new Map<string, number[]>()
    for (const a of data.attempts) {
      if (!a.sessionId) continue
      bySession.set(a.sessionId, [...(bySession.get(a.sessionId) ?? []), a.score])
    }
    const mean = (xs: number[]) => xs.reduce((t, x) => t + x, 0) / xs.length
    expect(mean(bySession.get('s1')!)).toBeCloseTo(32.5, 5)
    expect(mean(bySession.get('s2')!)).toBe(70)
  })
})

describe('buildExport', () => {
  it('summarises a session', () => {
    const out = buildExport('P01', ATTEMPTS)
    expect(out.participantCode).toBe('P01')
    expect(out.totals.attempts).toBe(3)
    expect(out.totals.distinctSigns).toBe(2)
    expect(out.totals.meanScore).toBe(58) // (40+55+80)/3
    expect(out.totals.firstAttemptAt).toBe('2026-08-06T10:00:00.000Z')
    expect(out.totals.lastAttemptAt).toBe('2026-08-06T10:02:00.000Z')
  })

  it('records first and last score per sign, which learning gain is measured from', () => {
    const kanawa = buildExport('P01', ATTEMPTS).perSign.find((s) => s.gloss === 'KANAWA')
    expect(kanawa?.firstScore).toBe(40)
    expect(kanawa?.lastScore).toBe(80)
    expect(kanawa?.attempts).toBe(2)
  })

  it('orders attempts chronologically regardless of input order', () => {
    const shuffled = [ATTEMPTS[2], ATTEMPTS[0], ATTEMPTS[1]]
    const out = buildExport('P01', shuffled)
    expect(out.attempts.map((a) => a.createdAt)).toEqual([
      '2026-08-06T10:00:00.000Z',
      '2026-08-06T10:01:00.000Z',
      '2026-08-06T10:02:00.000Z',
    ])
  })

  it('falls back to a placeholder rather than an empty participant code', () => {
    expect(buildExport('   ', ATTEMPTS).participantCode).toBe('anonymous')
  })

  it('handles a participant who never attempted anything', () => {
    const out = buildExport('P02', [])
    expect(out.totals.attempts).toBe(0)
    expect(out.totals.meanScore).toBeNull()
    expect(out.perSign).toEqual([])
  })

  it('summarises the latency measured on this participant’s hardware', () => {
    const samples = [latencyFor(ATTEMPTS[0], 120), latencyFor(ATTEMPTS[1], 180)]
    const out = buildExport('P01', ATTEMPTS, samples)
    expect(out.latency.summary?.n).toBe(2)
    expect(out.latency.summary?.withinTargetPct).toBe(100)
    expect(out.latency.samples).toHaveLength(2)
  })

  it('reports a session with no latency samples as null, not as a passing zero', () => {
    expect(buildExport('P01', ATTEMPTS).latency.summary).toBeNull()
  })
})

describe('toCsv', () => {
  it('emits a header plus one row per attempt', () => {
    const lines = toCsv(buildExport('P01', ATTEMPTS)).trim().split('\n')
    expect(lines).toHaveLength(4)
    expect(lines[0]).toBe(
      'participant_code,attempt_index,gloss,score,worst_fingers,reference_id,session_id,created_at,' +
        'latency_total_ms,latency_tracking_ms,latency_scoring_ms,latency_render_ms',
    )
    expect(lines[1]).toContain('P01,1,KANAWA,40')
  })

  it('joins each attempt to its latency sample', () => {
    const out = buildExport('P01', ATTEMPTS, [latencyFor(ATTEMPTS[0], 120)])
    const lines = toCsv(out).trim().split('\n')
    expect(lines[1].endsWith('120,20,30,70')).toBe(true)
  })

  it('leaves latency blank — never 0 — for an attempt that was not sampled', () => {
    const out = buildExport('P01', ATTEMPTS, [latencyFor(ATTEMPTS[0], 120)])
    const lines = toCsv(out).trim().split('\n')
    expect(lines[2].endsWith(',,,,')).toBe(true)
  })

  it('escapes values that would otherwise break the CSV', () => {
    const risky = buildExport('P,01"x', [attempt('A', 10, '2026-08-06T10:00:00.000Z')])
    const line = toCsv(risky).trim().split('\n')[1]
    expect(line.startsWith('"P,01""x"')).toBe(true)
  })
})
