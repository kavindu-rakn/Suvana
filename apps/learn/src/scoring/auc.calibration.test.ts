import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'
import type { SignRecording } from '../vision/types'
import { scoreAttempt } from './score'

// D-A35: opt-in, console-only measurement. Never import the report-writing
// calibration test. No directory/corpus access when AUC_CALIBRATE is not 1.
// Run with CALIBRATION_DIR and AUC_SCORER_COMMIT; AUC_BASELINE_MODULE optionally
// selects an ignored historical score.ts with its original local dependencies.
const enabled = process.env.AUC_CALIBRATE === '1'

/** P(different distance > same distance), with each exact tie worth half.
 * This is the Mann–Whitney U statistic, not AUC over saturated match scores. */
function rocAuc(same: number[], different: number[]): number {
  if (!same.length || !different.length) throw new Error('Both pair classes are required')
  let twiceU = 0
  for (const negative of different) {
    for (const positive of same) {
      twiceU += negative > positive ? 2 : negative === positive ? 1 : 0
    }
  }
  return twiceU / (2 * same.length * different.length)
}

function corpusHash(dir: string): string {
  const hash = createHash('sha256')
  for (const name of readdirSync(dir).filter(name => name.endsWith('.json')).sort()) {
    // Same filename-NUL-bytes SHA-256 convention as L-30, not the L-33 hash.
    hash.update(name).update('\0').update(readFileSync(join(dir, name)))
  }
  return hash.digest('hex')
}

describe.skipIf(!enabled)('D-A35 read-only same-pair ROC AUC', () => {
  it('prints separation, majority baseline, AUC and preservation evidence', async () => {
    // Small orientation/tie checks protect the measurement itself.
    expect(rocAuc([1, 2], [3, 4])).toBe(1)
    expect(rocAuc([3, 4], [1, 2])).toBe(0)
    expect(rocAuc([1, 1], [1, 1])).toBe(0.5)
    expect(rocAuc([1, 2], [2, 3])).toBe(0.875)
    expect(() => rocAuc([], [1])).toThrow('Both pair classes are required')

    const dir = resolve(process.env.CALIBRATION_DIR ?? join(process.cwd(), 'calibration'))
    const commit = process.env.AUC_SCORER_COMMIT
    if (!commit) throw new Error('Set AUC_SCORER_COMMIT to identify the measured source revision')
    const baseline = process.env.AUC_BASELINE_MODULE
    const scorerFile = resolve(baseline ?? join(process.cwd(), 'src/scoring/score.ts'))
    const scorer = baseline
      ? await import(/* @vite-ignore */ pathToFileURL(scorerFile).href) as { scoreAttempt: typeof scoreAttempt }
      : { scoreAttempt }
    const sources = ['score.ts', 'normalize.ts', 'dtw.ts', 'landmarks.ts', 'hints.ts']
    const sourceHashes = Object.fromEntries(sources.map(name => [name,
      createHash('sha256').update(readFileSync(join(dirname(scorerFile), name))).digest('hex')]))
    const hashBefore = corpusHash(dir)
    try {
      // Match calibration.test.ts's readdir order, grouping, first reference
      // take and directed cross-sign pairs exactly. Do not shuffle or resample.
      const names = readdirSync(dir).filter(name => name.endsWith('.json'))
      const byGloss = new Map<string, SignRecording[]>()
      for (const name of names) {
        const recording = JSON.parse(readFileSync(join(dir, name), 'utf8')) as SignRecording
        byGloss.set(recording.gloss, [...(byGloss.get(recording.gloss) ?? []), recording])
      }
      const usable = [...byGloss.entries()].filter(([, takes]) => takes.length >= 2)
      const positives: number[] = []
      const negatives: number[] = []
      for (const [gloss, takes] of usable) {
        for (let i = 1; i < takes.length; i++) {
          positives.push(scorer.scoreAttempt(takes[i], takes[0]).normalizedDistance)
        }
        for (const [otherGloss, others] of usable) {
          if (otherGloss === gloss) continue
          negatives.push(scorer.scoreAttempt(takes[0], others[0]).normalizedDistance)
        }
      }
      // Preserve the existing finite-distance filtering and cut convention.
      const same = positives.filter(Number.isFinite).sort((a, b) => a - b)
      const different = negatives.filter(Number.isFinite).sort((a, b) => a - b)
      let bestCorrect = 0
      let bestCut = 0
      for (const cut of [...same, ...different].sort((a, b) => a - b)) {
        const correct = same.filter(d => d <= cut).length + different.filter(d => d > cut).length
        if (correct > bestCorrect) { bestCorrect = correct; bestCut = cut }
      }
      const total = same.length + different.length
      const hashAfter = corpusHash(dir)
      const metrics = {
        scorer: baseline ? 'earlier-pre-L-30' : 'current', scorerCommit: commit, sourceHashes,
        takes: names.length, signs: byGloss.size, usableSigns: usable.length,
        sampledSameSignPairs: positives.length, sampledDifferentSignPairs: negatives.length,
        sameSignPairs: same.length, differentSignPairs: different.length, totalPairs: total,
        excludedNonFinitePairs: positives.length + negatives.length - total,
        bestCut, bestCutCorrectPairs: bestCorrect, separationPercent: bestCorrect / total * 100,
        majorityBaselinePercent: Math.max(same.length, different.length) / total * 100,
        rocAuc: rocAuc(same, different), corpusSha256Before: hashBefore, corpusSha256After: hashAfter,
        hashConvention: 'sorted JSON filename + NUL + raw file bytes',
      }
      console.info(`AUC_RESULT ${JSON.stringify(metrics)}`)
      expect(hashAfter).toBe(hashBefore)
      expect(hashBefore).toBe('bad16fe51e84c31852e4e78ca1230e3a18e8460b4813a2f3886bfb5de7f87265')
      expect([names.length, byGloss.size, usable.length]).toEqual([557, 33, 32])
      expect([same.length, different.length, total]).toEqual([524, 992, 1516])
      expect(metrics.excludedNonFinitePairs).toBe(0)
      expect(metrics.majorityBaselinePercent.toFixed(1)).toBe('65.4')
      if (baseline) {
        // Historical reproduction gate; never tune sampling to satisfy it.
        expect(metrics.separationPercent.toFixed(1), 'STOP: earlier separation mismatch').toBe('74.6')
        expect(metrics.rocAuc.toFixed(3), 'STOP: earlier AUC mismatch').toBe('0.744')
      }
    } finally {
      // Also verify preservation when scoring or a reproduction assertion fails.
      expect(corpusHash(dir), 'Calibration corpus changed during measurement').toBe(hashBefore)
    }
  }, 120_000)
})
