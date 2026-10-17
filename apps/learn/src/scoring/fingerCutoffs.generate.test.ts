import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { SignRecording } from '../vision/types'
import { HAND_FINGERS, fingerDeviation } from './fingerStates'
import { scoreAttempt } from './score'
import { FINGER_CUTOFF_PROVENANCE, SIGN_FINGER_CUTOFFS } from './fingerCutoffs'

const sha = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex')
const scoringFiles = ['score.ts', 'normalize.ts', 'dtw.ts', 'landmarks.ts']
// Hash the scorer as git stores it (LF): Windows working copies may still hold CRLF.
function scorerHash() {
  return sha(scoringFiles.map((file) => readFileSync(join(process.cwd(), 'src/scoring', file), 'utf8').replace(/\r\n/g, '\n')).join('\n'))
}
const enabled = process.env.L33_GENERATE === '1' || process.env.L33_VERIFY_TABLE === '1'

describe('L-33 generated cut-off provenance', () => {
  it.skipIf(process.env.L33_GENERATE === '1')('binds finite ordered thresholds to unchanged shipped references and scorer', () => {
    const provenance = FINGER_CUTOFF_PROVENANCE as Record<string, unknown>
    expect(provenance.scorerSha256).toBe(scorerHash())
    expect(Object.keys(SIGN_FINGER_CUTOFFS)).toHaveLength(23)
    for (const [id, row] of Object.entries(SIGN_FINGER_CUTOFFS)) {
      const bytes = readFileSync(join(process.cwd(), 'public/references', row.file))
      const ref = JSON.parse(bytes.toString()) as SignRecording
      expect(sha(bytes)).toBe(row.referenceSha256)
      expect(ref.id).toBe(id)
      expect(ref.gloss).toBe(row.gloss)
      expect(ref.source).toBe(row.source)
      expect(row.takes).toBeGreaterThanOrEqual(8)
      expect(row.wrong).toHaveLength(5)
      expect(row.almost).toHaveLength(5)
      row.wrong.forEach((v, i) => {
        expect(Number.isFinite(v)).toBe(true)
        expect(row.almost[i]).toBeGreaterThanOrEqual(0)
        expect(v).toBeGreaterThanOrEqual(row.almost[i])
        expect(row.samples[i]).toBeGreaterThan(0)
      })
    }
  })
})

describe.skipIf(!enabled)('L-33 final all-data refit, not held-out evidence', () => {
  it('reproduces the table using only corpus-backed shipped references', () => {
    const dir = process.env.CALIBRATION_DIR
    if (!dir) throw new Error('Explicit CALIBRATION_DIR required')
    const names = readdirSync(dir).filter((n) => n.endsWith('.json')).sort()
    const corpusHash = () => {
      const h = createHash('sha256')
      for (const name of names) h.update(name).update(readFileSync(join(dir, name)))
      return h.digest('hex')
    }
    const before = corpusHash()
    const takes = names.map((n) => JSON.parse(readFileSync(join(dir, n), 'utf8')) as SignRecording)
    expect(takes).toHaveLength(557)
    const table: typeof SIGN_FINGER_CUTOFFS = {}
    const referenceDir = join(process.cwd(), 'public/references')
    for (const file of readdirSync(referenceDir).filter((n) => n.endsWith('.json')).sort()) {
      const bytes = readFileSync(join(referenceDir, file))
      const reference = JSON.parse(bytes.toString()) as SignRecording
      if (!Array.isArray(reference.frames) || reference.provisional) continue
      const same = takes.filter((t) => t.gloss === reference.gloss)
      if (same.length < 8) continue
      // Never transfer a one-signer fit to another signer or a local replacement.
      const exact = same.find((t) => t.id === reference.id && JSON.stringify(t.frames) === JSON.stringify(reference.frames))
      if (!exact) continue
      const values = HAND_FINGERS.map(() => [] as number[])
      for (const attempt of same.filter((t) => t !== exact)) {
        for (const hand of scoreAttempt(attempt, reference).hands) {
          if (hand.missing || hand.perLandmark.length !== 21) continue
          HAND_FINGERS.forEach((finger, fi) => values[fi].push(fingerDeviation(hand.perLandmark, finger)))
        }
      }
      const q = (v: number[], p: number) => {
        if (!v.length) throw new Error('No training fingers')
        return [...v].sort((a, b) => a - b)[Math.ceil(p * v.length) - 1]
      }
      table[reference.id] = { gloss: reference.gloss, source: reference.source!, file,
        referenceSha256: sha(bytes), takes: same.length, samples: values.map((v) => v.length),
        wrong: values.map((v) => q(v, 0.98)), almost: values.map((v) => q(v, 0.90)) }
    }
    expect(corpusHash()).toBe(before)
    const provenance = { phase1Commit: '886b8772a181d80f8b17ab0c28357af920e49010',
      corpusSha256: before, corpusTakes: 557, corpusSigns: 33, scorerSha256: scorerHash(),
      wrongPercentile: 0.98, almostPercentile: 0.90, minimumTakes: 8,
      fingerOrder: HAND_FINGERS, quantile: 'nearest rank; strict >',
      fit: 'All same-sign takes except exact shipped reference; anatomical fingers pooled across measured hands',
      limitation: "Separation on one signer's recordings, never learner accuracy. Final reference-specific refit is not held-out evidence.",
      phase1AnyWrongPct: 13.24110671936759, phase1ClearCatchPct: 70.65092926979652 }
    if (process.env.L33_GENERATE === '1') console.info('L33_TABLE ' + JSON.stringify({ provenance, table }))
    else {
      expect(table).toEqual(SIGN_FINGER_CUTOFFS)
      expect(provenance).toEqual(FINGER_CUTOFF_PROVENANCE)
    }
  }, 300_000)
})
