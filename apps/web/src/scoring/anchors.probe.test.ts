import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { scoreAttempt } from './score'
import type { SignRecording } from '../vision/types'

/**
 * Diagnostic, not a guard: how close do *different* bundled references sit to
 * each other? Any anchor at or above the smallest cross-sign distance makes two
 * distinct signs both score 100, which would tell a learner "perfect" for the
 * wrong sign. Run with `npx vitest run anchors.probe`.
 */
const REFERENCE_DIR = join(process.cwd(), 'public', 'references')

function load(): SignRecording[] {
  try {
    return readdirSync(REFERENCE_DIR)
      .filter((n) => n.endsWith('.json') && n !== 'manifest.json')
      .map((n) => JSON.parse(readFileSync(join(REFERENCE_DIR, n), 'utf8')) as SignRecording)
  } catch {
    return []
  }
}

const refs = load()
const d = refs.length > 30 ? describe : describe.skip

d('cross-reference distance floor', () => {
  it('reports the closest distinct-sign pairs', () => {
    const sample = refs.slice(0, 60)
    const pairs: Array<{ a: string; b: string; dist: number }> = []
    for (let i = 0; i < sample.length; i++) {
      for (let j = i + 1; j < sample.length; j++) {
        if (sample[i].gloss === sample[j].gloss) continue
        const dist = scoreAttempt(sample[i], sample[j]).normalizedDistance
        if (Number.isFinite(dist)) pairs.push({ a: sample[i].gloss, b: sample[j].gloss, dist })
      }
    }
    pairs.sort((x, y) => x.dist - y.dist)
    const lines = pairs.slice(0, 10).map((p) => `    ${p.dist.toFixed(3)}  ${p.a} vs ${p.b}`)
    const pct = (q: number) => pairs[Math.floor(q * (pairs.length - 1))].dist.toFixed(3)
    console.log(
      [
        '',
        `  ${pairs.length} distinct-sign pairs`,
        `  closest ${pairs[0].dist.toFixed(3)}   p1 ${pct(0.01)}   p5 ${pct(0.05)}   median ${pct(0.5)}`,
        '  closest pairs:',
        ...lines,
        '',
      ].join('\n'),
    )
    expect(pairs.length).toBeGreaterThan(0)
  })
})
