import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { SignRecording } from '../vision/types'
import { FINGER_CUTOFFS, HAND_FINGERS, fingerDeviation } from './fingerStates'
import { scoreAttempt } from './score'

/**
 * Why per-finger states are not shown (kvn, 13 Oct), measured on the same
 * calibration corpus as calibration.test.ts (one fluent signer, all takes of
 * the calibration signs). It compares each finger's deviation in two kinds of
 * pair: two takes of the SAME sign (a correct rendition) and takes of two
 * DIFFERENT signs (a wrong sign).
 *
 * Measured 13 Oct (557 takes, 33 signs; worst-joint deviation per finger):
 *   same sign      p10 0.305  p50 0.790  p75 1.159  p90 1.691
 *   different sign p10 0.710  p50 1.371  p75 1.848  p90 2.469
 * so 99.7% of same-sign fingers exceed the 0.1 hint threshold, and the two
 * distributions overlap too much for any fixed cut-off to separate them.
 *
 * If these expectations stop holding (the scorer changed), revisit whether
 * finger states can be shown. Skips when the corpus is not present.
 * CALIBRATION_DIR overrides the folder (default: ./calibration).
 */
const DIR = process.env.CALIBRATION_DIR ?? join(process.cwd(), 'calibration')

function loadByGloss(): Map<string, SignRecording[]> {
  const byGloss = new Map<string, SignRecording[]>()
  let names: string[] = []
  try {
    names = readdirSync(DIR).filter((n) => n.endsWith('.json'))
  } catch {
    return byGloss
  }
  for (const name of names.sort()) {
    const rec = JSON.parse(readFileSync(join(DIR, name), 'utf8')) as SignRecording
    byGloss.set(rec.gloss, [...(byGloss.get(rec.gloss) ?? []), rec])
  }
  return byGloss
}

function fingerDeviations(attempt: SignRecording, reference: SignRecording): number[] {
  const out: number[] = []
  for (const hand of scoreAttempt(attempt, reference).hands) {
    if (hand.missing) continue
    for (const f of HAND_FINGERS) out.push(fingerDeviation(hand.perLandmark, f))
  }
  return out
}

function quantile(values: number[], q: number): number {
  const s = [...values].sort((a, b) => a - b)
  return s[Math.min(s.length - 1, Math.floor(q * s.length))]
}

const byGloss = loadByGloss()
const glosses = [...byGloss.keys()].sort()
const hasData = glosses.filter((g) => byGloss.get(g)!.length >= 2).length >= 2

describe.skipIf(!hasData)('per-finger deviation on the calibration corpus', () => {
  // Up to 6 takes per sign against each other; up to 4 takes of the next sign
  // (alphabetically) against the same sign's takes.
  const same: number[] = []
  const different: number[] = []
  glosses.forEach((g, gi) => {
    const takes = byGloss.get(g)!.slice(0, 6)
    for (let i = 0; i < takes.length; i++)
      for (let j = 0; j < takes.length; j++)
        if (i !== j) same.push(...fingerDeviations(takes[i], takes[j]))
    const other = byGloss.get(glosses[(gi + 1) % glosses.length])!
    for (let i = 0; i < Math.min(takes.length, 4); i++)
      different.push(...fingerDeviations(other[i % other.length], takes[i]))
  })

  it('marks almost every finger of a correct take Wrong at the hint threshold', () => {
    const wrongShare = same.filter((d) => d > FINGER_CUTOFFS.wrongAbove).length / same.length
    console.info(`same-sign fingers above ${FINGER_CUTOFFS.wrongAbove}: ${(wrongShare * 100).toFixed(1)}%`)
    expect(wrongShare).toBeGreaterThan(0.9)
  })

  it('overlaps same-sign and different-sign deviations too much for a fixed cut-off', () => {
    const q = (v: number[]) => [0.1, 0.5, 0.75, 0.9].map((p) => quantile(v, p).toFixed(3)).join(' ')
    console.info(`same sign p10/50/75/90: ${q(same)}; different sign: ${q(different)}`)
    // A typical wrong-sign finger is closer than the worst tenth of correct ones.
    expect(quantile(different, 0.5)).toBeLessThan(quantile(same, 0.9))
  })
})
