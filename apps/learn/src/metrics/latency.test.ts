import { describe, expect, it } from 'vitest'
import {
  LATENCY_TARGET_MS,
  buildSample,
  percentile,
  summarizeLatency,
} from './latency'
import type { LatencySample, LatencySource, SampleMeta } from './latency'

function sample(totalMs: number, source: LatencySource = 'practice'): LatencySample {
  return {
    id: `a-${totalMs}-${source}`,
    source,
    gloss: 'KANAWA',
    trackingMs: totalMs * 0.2,
    scoringMs: totalMs * 0.5,
    renderMs: totalMs * 0.3,
    totalMs,
    frameCount: 90,
    createdAt: '2026-08-16T10:00:00.000Z',
  }
}

const META: SampleMeta = {
  id: 'attempt-1',
  source: 'practice',
  gloss: 'KANAWA',
  frameCount: 90,
  createdAt: '2026-08-16T10:00:00.000Z',
}

describe('buildSample', () => {
  it('splits the path into stages that add up to the total', () => {
    const s = buildSample(
      { captureAt: 1000, scoreStartAt: 1012, scoreEndAt: 1043, paintAt: 1051 },
      META,
    )
    expect(s.trackingMs).toBe(12)
    expect(s.scoringMs).toBe(31)
    expect(s.renderMs).toBe(8)
    expect(s.totalMs).toBe(51)
    expect(s.trackingMs + s.scoringMs + s.renderMs).toBe(s.totalMs)
  })

  it('keeps the attempt id, so a sample joins onto the attempt log', () => {
    const s = buildSample({ captureAt: 0, scoreStartAt: 1, scoreEndAt: 2, paintAt: 3 }, META)
    expect(s.id).toBe('attempt-1')
    expect(s.gloss).toBe('KANAWA')
    expect(s.frameCount).toBe(90)
  })

  it('rounds to a tenth of a millisecond rather than carrying clock noise', () => {
    const s = buildSample(
      { captureAt: 0, scoreStartAt: 5.239_1, scoreEndAt: 20.771_9, paintAt: 33.333_3 },
      META,
    )
    expect(s.trackingMs).toBe(5.2)
    expect(s.scoringMs).toBe(15.5)
    expect(s.totalMs).toBe(33.3)
  })
})

describe('percentile', () => {
  const sorted = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

  it('returns an observed value, never an interpolated one', () => {
    expect(sorted).toContain(percentile(sorted, 95))
  })

  it('spans the distribution', () => {
    expect(percentile(sorted, 0)).toBe(1)
    expect(percentile(sorted, 50)).toBe(6)
    expect(percentile(sorted, 100)).toBe(10)
  })

  it('handles a single sample without going out of bounds', () => {
    expect(percentile([42], 95)).toBe(42)
  })

  it('takes the upper of the two middle values on an even count', () => {
    // Nearest-rank never averages, so an even-sized set has no true midpoint.
    // Pinned here so the convention is a decision rather than an accident.
    expect(percentile([20, 40], 50)).toBe(40)
  })

  it('is NaN for no data — an unmeasured value must not read as zero', () => {
    expect(percentile([], 50)).toBeNaN()
  })
})

describe('summarizeLatency', () => {
  it('is null with no samples, so an unmeasured target cannot look like a pass', () => {
    expect(summarizeLatency([])).toBeNull()
  })

  it('summarises the total across samples', () => {
    const out = summarizeLatency([100, 120, 140, 160, 900].map((ms) => sample(ms)))!
    expect(out.n).toBe(5)
    expect(out.total.medianMs).toBe(140)
    expect(out.total.maxMs).toBe(900)
    expect(out.total.meanMs).toBe(284)
  })

  it('reports the share inside the target, not just the average', () => {
    // The average alone hides a slow tail: this set averages under 300 ms while
    // a fifth of attempts miss it.
    const out = summarizeLatency([100, 120, 140, 160, 900].map((ms) => sample(ms)))!
    expect(out.total.meanMs).toBeLessThan(LATENCY_TARGET_MS)
    expect(out.withinTargetPct).toBe(80)
  })

  it('counts a sample exactly on the target as meeting it', () => {
    expect(summarizeLatency([sample(300)])!.withinTargetPct).toBe(100)
    expect(summarizeLatency([sample(301)])!.withinTargetPct).toBe(0)
  })

  it('accepts a different target for sensitivity checks', () => {
    expect(summarizeLatency([sample(150), sample(250)], 200)!.withinTargetPct).toBe(50)
  })

  it('breaks the path down by stage', () => {
    const out = summarizeLatency([sample(100), sample(200), sample(300)])!
    expect(out.tracking.medianMs).toBe(40)
    expect(out.scoring.medianMs).toBe(100)
    expect(out.render.medianMs).toBe(60)
    expect(out.scoring.maxMs).toBe(150)
  })

  it('counts practice and scenario samples separately', () => {
    const out = summarizeLatency([
      sample(100, 'practice'),
      sample(200, 'practice'),
      sample(300, 'scenario'),
    ])!
    expect(out.bySource).toEqual({ practice: 2, scenario: 1 })
  })
})
