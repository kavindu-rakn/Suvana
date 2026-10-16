import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CURRICULUM_UNITS } from '../data/curriculum'
import type { SignRecording } from '../vision/types'
import { HAND_FINGERS, fingerDeviation } from './fingerStates'
import { scoreAttempt } from './score'

// L-33 preregistration: docs/plan/handoffs/L-33.md. Measurement only.
// Run: L33_CALIBRATE=1 CALIBRATION_DIR=<external corpus> npx vitest run
// src/scoring/fingerCutoffs.calibration.test.ts. Never writes corpus or reports.
const WRONG_P = 0.98
const ALMOST_P = 0.90
const FOLDS = 4
const MIN_TAKES = 8
const enabled = process.env.L33_CALIBRATE === '1'

function quantile(values: number[], p: number): number {
  if (!values.length) throw new Error('No measured training fingers')
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)]
}

type Reading = { finger: number; deviation: number }
function measure(attempt: SignRecording, reference: SignRecording) {
  const readings: Reading[] = []
  let missing = 0
  for (const hand of scoreAttempt(attempt, reference).hands) {
    if (hand.missing || !hand.perLandmark.length) {
      missing++
      continue
    }
    HAND_FINGERS.forEach((finger, fi) => {
      const deviation = fingerDeviation(hand.perLandmark, finger)
      if (!Number.isFinite(deviation)) throw new Error('Non-finite deviation')
      readings.push({ finger: fi, deviation })
    })
  }
  return { readings, missing }
}

function counters() {
  return {
    attempts: 0, anyWrong: 0, anyAlmost: 0, anyAboveP90: 0,
    unmeasuredAttempts: 0, missingHands: 0,
    fingers: 0, wrong: 0, almost: 0, aboveP90: 0,
    perFinger: HAND_FINGERS.map((finger) => ({ finger, n: 0, wrong: 0, almost: 0, aboveP90: 0 })),
  }
}
type Counts = ReturnType<typeof counters>
type Fit = {
  reference: SignRecording; training: SignRecording[]; held: SignRecording[]
  wrong: number[]; almost: number[]; p95: number[]
}
function tally(count: Counts, measurement: ReturnType<typeof measure>, fit: Pick<Fit, 'wrong' | 'almost'>) {
  count.missingHands += measurement.missing
  if (!measurement.readings.length) {
    count.unmeasuredAttempts++
    return
  }
  count.attempts++
  let wrong = false, almost = false, aboveP90 = false
  for (const { finger, deviation } of measurement.readings) {
    const w = deviation > fit.wrong[finger]
    const a = !w && deviation > fit.almost[finger]
    const p90 = deviation > fit.almost[finger]
    const pf = count.perFinger[finger]
    count.fingers++; pf.n++
    if (w) { count.wrong++; pf.wrong++; wrong = true }
    if (a) { count.almost++; pf.almost++; almost = true }
    if (p90) { count.aboveP90++; pf.aboveP90++; aboveP90 = true }
  }
  if (wrong) count.anyWrong++
  if (almost) count.anyAlmost++
  if (aboveP90) count.anyAboveP90++
}
const percent = (n: number, d: number) => d ? 100 * n / d : null
function summary(c: Counts) {
  return {
    ...c,
    anyWrongPct: percent(c.anyWrong, c.attempts),
    anyAlmostPct: percent(c.anyAlmost, c.attempts),
    anyAlmostOrWrongPct: percent(c.anyAboveP90, c.attempts),
    wrongFingerPct: percent(c.wrong, c.fingers),
    almostFingerPct: percent(c.almost, c.fingers),
    almostOrWrongFingerPct: percent(c.aboveP90, c.fingers),
    perFinger: c.perFinger.map((f) => ({ ...f,
      wrongPct: percent(f.wrong, f.n), almostPct: percent(f.almost, f.n),
      almostOrWrongPct: percent(f.aboveP90, f.n),
    })),
  }
}

describe('L-33 measurement rules', () => {
  it('uses fixed nearest-rank percentiles and rejects empty training data', () => {
    expect(quantile(Array.from({ length: 100 }, (_, i) => i + 1), WRONG_P)).toBe(98)
    expect(quantile([4, 1, 3, 2], ALMOST_P)).toBe(4)
    expect(() => quantile([], WRONG_P)).toThrow('No measured')
  })
  it('keeps states exclusive, uses strict boundaries, and excludes unmeasured attempts', () => {
    const c = counters()
    const fit = { wrong: [2], almost: [1] }
    tally(c, { readings: [{ finger: 0, deviation: 1 }], missing: 0 }, fit)
    tally(c, { readings: [{ finger: 0, deviation: 2 }], missing: 0 }, fit)
    tally(c, { readings: [{ finger: 0, deviation: 3 }], missing: 0 }, fit)
    tally(c, { readings: [], missing: 1 }, fit)
    expect(c.attempts).toBe(3)
    expect(c.anyWrong).toBe(1)
    expect(c.anyAlmost).toBe(1)
    expect(c.anyAboveP90).toBe(2)
    expect(c.fingers).toBe(3)
    expect(c.unmeasuredAttempts).toBe(1)
    expect(c.missingHands).toBe(1)
  })
})

describe.skipIf(!enabled)('L-33 held-out separation on one signer recordings', () => {
  it('reports the single preregistered experiment without changing scoring', () => {
    const configuredDir = process.env.CALIBRATION_DIR
    if (!configuredDir) throw new Error('Explicit CALIBRATION_DIR is required')
    const dir: string = configuredDir
    const names = readdirSync(dir).filter((n) => n.endsWith('.json')).sort()
    function fingerprint() {
      const hash = createHash('sha256')
      for (const name of names) hash.update(name).update(readFileSync(join(dir, name)))
      return hash.digest('hex')
    }
    const before = fingerprint()
    const groups = new Map<string, SignRecording[]>()
    for (const name of names) {
      const rec = JSON.parse(readFileSync(join(dir, name), 'utf8')) as SignRecording
      groups.set(rec.gloss, [...(groups.get(rec.gloss) ?? []), rec])
    }
    expect(names).toHaveLength(557)
    expect(groups.size).toBe(33)
    const glosses = [...groups.keys()].filter((g) => groups.get(g)!.length >= MIN_TAKES).sort()
    expect(glosses).toHaveLength(23)
    const onPath = new Set(CURRICULUM_UNITS.filter((u) => u.status === 'approved').flatMap((u) => u.signs))
    const same = counters(), different = counters(), spot = counters()
    const perSign = new Map(glosses.map((g) => [g, counters()]))
    let clearN = 0, clearWrong = 0, clearGroups = 0
    const clearPerFinger = HAND_FINGERS.map((finger) => ({ finger, n: 0, wrong: 0 }))
    const thresholds: object[] = []
    const kaggle = JSON.parse(readFileSync(join(process.cwd(), 'public/references/kaggle_JANUARY.json'), 'utf8')) as SignRecording
    for (let fold = 0; fold < FOLDS; fold++) {
      const fits = new Map<string, Fit>()
      for (const gloss of glosses) {
        const takes = groups.get(gloss)!
        const training = takes.filter((_, i) => i % FOLDS !== fold)
        const held = takes.filter((_, i) => i % FOLDS === fold)
        // Object identity makes exclusion independent of potentially duplicate recording IDs.
        expect(training.every((t) => !held.includes(t))).toBe(true)
        const reference = training[0]
        const values = HAND_FINGERS.map(() => [] as number[])
        for (const take of training.slice(1)) {
          for (const r of measure(take, reference).readings) values[r.finger].push(r.deviation)
        }
        const fit = { reference, training, held,
          wrong: values.map((v) => quantile(v, WRONG_P)),
          almost: values.map((v) => quantile(v, ALMOST_P)),
          p95: values.map((v) => quantile(v, 0.95)),
        }
        fits.set(gloss, fit)
        thresholds.push({ fold, gloss, referenceId: reference.id,
          trainingTakes: training.length, heldTakes: held.length,
          samplesPerFinger: values.map((v) => v.length),
          wrong: fit.wrong, almost: fit.almost, p95: fit.p95,
        })
        for (const take of held) {
          const m = measure(take, reference)
          tally(same, m, fit); tally(perSign.get(gloss)!, m, fit)
        }
        if (gloss === 'JANUARY') tally(spot, measure(kaggle, reference), fit)
      }
      for (const target of glosses) {
        const fit = fits.get(target)!
        for (const source of glosses) {
          if (source === target) continue
          const sourceFit = fits.get(source)!
          const trainingCross = HAND_FINGERS.map(() => [] as number[])
          for (const take of sourceFit.training) {
            for (const r of measure(take, fit.reference).readings) trainingCross[r.finger].push(r.deviation)
          }
          const clear = trainingCross.map((v, fi) => v.length > 0 &&
            v.reduce((a, b) => a + b, 0) / v.length > Math.max(fit.p95[fi], sourceFit.p95[fi]))
          clearGroups += clear.filter(Boolean).length
          for (const take of sourceFit.held) {
            const m = measure(take, fit.reference)
            tally(different, m, fit)
            for (const r of m.readings) {
              if (!clear[r.finger]) continue
              clearN++; clearPerFinger[r.finger].n++
              if (r.deviation > fit.wrong[r.finger]) {
                clearWrong++; clearPerFinger[r.finger].wrong++
              }
            }
          }
        }
      }
      console.info(`L-33 completed fold ${fold + 1}/${FOLDS}`)
    }
    const after = fingerprint()
    expect(after).toBe(before)
    expect(same.unmeasuredAttempts).toBe(0)
    expect(clearN).toBeGreaterThan(0)
    const falseAlarm = same.anyWrong / same.attempts
    const catchRate = clearWrong / clearN
    console.info('L33_RESULT ' + JSON.stringify({
      interpretation: "separation on one signer's recordings; never learner accuracy",
      corpus: { takes: names.length, signs: groups.size, sha256: before, unchanged: before === after },
      rules: { folds: FOLDS, minTakes: MIN_TAKES, wrongPercentile: WRONG_P, almostPercentile: ALMOST_P,
        quantile: 'nearest rank; strict >', reference: 'first training filename per sign/fold',
        clear: 'training cross-sign finger mean > max(source same p95, target same p95)',
        aggregation: 'micro average; anatomical fingers pooled across measured hands' },
      coverage: { signs: glosses.length, takes: same.attempts, onPath: glosses.filter((g) => onPath.has(g)),
        offPath: glosses.filter((g) => !onPath.has(g)) },
      same: summary(same), different: summary(different),
      clearlyDifferent: { n: clearN, wrong: clearWrong, wrongPct: 100 * catchRate,
        trainingSignPairFingerGroups: clearGroups,
        perFinger: clearPerFinger.map((f) => ({ ...f, wrongPct: percent(f.wrong, f.n) })) },
      perSign: Object.fromEntries([...perSign].map(([g, c]) => [g, summary(c)])),
      januaryKaggleSpotOnly: { note: 'One external recording repeated against four training references; not four independent takes, not acceptance evidence', ...summary(spot) },
      thresholds,
      acceptance: { maxAnyWrongPct: 20, minClearCatchPct: 50,
        pass: falseAlarm <= 0.20 && catchRate >= 0.50 },
    }))
    // Scientific failure is a valid experiment result, not a broken software test.
    // No runtime threshold table is generated; Phase 2 remains separately gated.
  }, 1_800_000)
})
