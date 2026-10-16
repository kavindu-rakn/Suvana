import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { calibratedFingerStates } from './fingerStates'
import { SIGN_FINGER_CUTOFFS } from './fingerCutoffs'
import { LANDMARK_FINGER } from './landmarks'
import { scoreAttempt } from './score'
import { pickReferenceList } from '../storage/references'
import type { RecordingMeta, SignRecording } from '../vision/types'

const id = Object.keys(SIGN_FINGER_CUTOFFS).find((id) => SIGN_FINGER_CUTOFFS[id].gloss === 'GREEN')!
const fit = SIGN_FINGER_CUTOFFS[id]
const reference = { id, gloss: fit.gloss, source: fit.source }
const measured = { missing: false, perLandmark: Array(21).fill(0) as number[] }

describe('calibrated finger states', () => {
  it('uses each anatomical finger own cut-offs and preserves the strict boundary', () => {
    const perLandmark = LANDMARK_FINGER.map((finger) => finger === 'index'
      ? (fit.almost[1] + fit.wrong[1]) / 2
      : finger === 'middle' ? fit.wrong[2] + 0.01 : 0)
    expect(calibratedFingerStates({ ...measured, perLandmark }, reference).map((r) => r.state))
      .toEqual(['correct', 'almost', 'wrong', 'correct', 'correct'])
    expect(calibratedFingerStates({ ...measured, perLandmark: Array(21).fill(fit.wrong[0]) }, reference)[0].state).toBe('almost')
  })
  it('has no fallback for unsupported, changed-source, wrong-gloss or provisional references', () => {
    for (const ref of [{ ...reference, id: 'local' }, { ...reference, source: 'kaggle-dataset' },
      { ...reference, gloss: 'OTHER' }, { ...reference, provisional: true }]) {
      expect(calibratedFingerStates(measured, ref)).toEqual([])
    }
  })
  it('never interprets missing, partial or invalid hand data as Correct', () => {
    expect(calibratedFingerStates({ ...measured, missing: true }, reference)).toEqual([])
    for (const perLandmark of [[], [0], Array(21).fill(NaN), Array(21).fill(Infinity), Array(21).fill(-1)]) {
      expect(calibratedFingerStates({ ...measured, perLandmark }, reference)).toEqual([])
    }
  })
  it('does not mutate scorer outputs or input recordings', () => {
    const ref = JSON.parse(readFileSync(join(process.cwd(), 'public/references', fit.file), 'utf8')) as SignRecording
    const result = scoreAttempt(ref, ref)
    const before = JSON.stringify({ ref, result })
    for (const hand of result.hands) expect(calibratedFingerStates(hand, ref)).toHaveLength(5)
    expect(JSON.stringify({ ref, result })).toBe(before)
    expect(result.score).toBe(100)
  })
  it('restricts current default selection to corpus-backed reference IDs', () => {
    const index = JSON.parse(readFileSync(join(process.cwd(), 'public/reference-index.json'), 'utf8'))
    const entries = (Array.isArray(index) ? index : index.recordings) as RecordingMeta[]
    const selected = pickReferenceList(entries)
    const eligible = selected.filter((r) => Object.hasOwn(SIGN_FINGER_CUTOFFS, r.id))
    expect(eligible.length).toBeGreaterThan(0)
    const january = selected.find((r) => r.gloss === 'JANUARY')!
    expect(january.source).toBe('kaggle-dataset')
    expect(calibratedFingerStates(measured, january)).toEqual([])
    console.info(`L33_DEFAULT_COVERAGE ${eligible.length}/23: ${eligible.map((r) => r.gloss).join(', ')}`)
  })
})
