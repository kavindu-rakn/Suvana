import { describe, expect, it } from 'vitest'
import { isSentenceReference } from '../data/sentences'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import type { SignRecording } from '../vision/types'
import { handednessesIn, referenceHandednessesIn, TWO_HAND_FRAME_THRESHOLD } from './normalize'
import { scoreAttempt } from './score'
import {
  buildRecording,
  canonicalHand,
  mirrorRecording,
  rotatedHand,
  timeWarp,
  translate,
  withoutHands,
  zoom,
} from './testFixtures'

const L30_EVIDENCE = join(process.cwd(), '..', '..', '.agent-local', 'evidence', 'L-30')
const numericResult = (result: ReturnType<typeof scoreAttempt>) => JSON.parse(JSON.stringify({
  score: result.score, normalizedDistance: result.normalizedDistance, hands: result.hands,
  worstJoints: result.worstJoints, mirrored: result.mirrored, twoHanded: result.twoHanded,
}))

/** Opt-in measurement with the existing calibration.test.ts sampling. Writes
 * derived metrics only, never recordings; no corpus file is moved or changed. */
it.skipIf(!process.env.L30_MEASURE_PHASE)('L-30 calibration: measured before/after stop gate', () => {
  const phase = process.env.L30_MEASURE_PHASE
  expect(['before', 'after']).toContain(phase)
  const dir = join(process.cwd(), 'calibration')
  const names = readdirSync(dir).filter((name) => name.endsWith('.json')).sort()
  const hash = createHash('sha256')
  const byGloss = new Map<string, SignRecording[]>()
  for (const name of names) {
    const raw = readFileSync(join(dir, name))
    hash.update(name).update('\0').update(raw)
    const recording = JSON.parse(raw.toString('utf8')) as SignRecording
    byGloss.set(recording.gloss, [...(byGloss.get(recording.gloss) ?? []), recording])
  }
  const usable = [...byGloss.entries()].filter(([, takes]) => takes.length >= 2)
  const positive: number[] = []
  const negative: number[] = []
  for (const [gloss, takes] of usable) {
    for (let i = 1; i < takes.length; i++) positive.push(scoreAttempt(takes[i], takes[0]).normalizedDistance)
    for (const [otherGloss, other] of usable) {
      if (otherGloss !== gloss) negative.push(scoreAttempt(takes[0], other[0]).normalizedDistance)
    }
  }
  const pos = positive.filter(Number.isFinite)
  const neg = negative.filter(Number.isFinite)
  let correct = 0
  let bestCut = 0
  for (const cut of [...pos, ...neg].sort((a, b) => a - b)) {
    const count = pos.filter((d) => d <= cut).length + neg.filter((d) => d > cut).length
    if (count > correct) { correct = count; bestCut = cut }
  }
  const total = pos.length + neg.length
  const sourceHash = createHash('sha256').update(readFileSync(join(process.cwd(), 'src/scoring/score.ts')))
    .update(readFileSync(join(process.cwd(), 'src/scoring/normalize.ts'))).digest('hex')
  const metrics = { phase, takes: names.length, signs: byGloss.size, usableSigns: usable.length,
    sameSignPairs: pos.length, differentSignPairs: neg.length, separationPercent: correct / total * 100,
    majorityBaselinePercent: Math.max(pos.length, neg.length) / total * 100,
    bestCut, corpusSha256: hash.digest('hex'), sourceSha256: sourceHash }
  mkdirSync(L30_EVIDENCE, { recursive: true })
  writeFileSync(join(L30_EVIDENCE, `${phase}.json`), JSON.stringify(metrics, null, 2))
  console.info(JSON.stringify(metrics))

  // Snapshot actual non-self comparisons for every shipped reference. Numeric
  // parent outputs let the post-change test prove two-handed results unchanged.
  if (phase === 'before') {
    const index = JSON.parse(readFileSync(join(process.cwd(), 'public/reference-index.json'), 'utf8')) as {
      recordings: Array<{ file: string; hands: 1 | 2 }>
    }
    const refs = index.recordings.map((meta) => JSON.parse(readFileSync(join(process.cwd(), 'public/references', meta.file), 'utf8')) as SignRecording)
    const outputs = index.recordings.map((meta, i) => ({ file: meta.file, indexHands: meta.hands,
      result: numericResult(scoreAttempt(refs[(i + 1) % refs.length], refs[i])) }))
    writeFileSync(join(L30_EVIDENCE, 'reference-baseline.json'), JSON.stringify(outputs))
  } else {
    const before = JSON.parse(readFileSync(join(L30_EVIDENCE, 'before.json'), 'utf8')) as typeof metrics
    expect(metrics.corpusSha256).toBe(before.corpusSha256)
    expect(metrics.sameSignPairs).toBe(before.sameSignPairs)
    expect(metrics.differentSignPairs).toBe(before.differentSignPairs)
  }
  expect(metrics.majorityBaselinePercent.toFixed(1)).toBe('65.4')
  expect(metrics.separationPercent, 'STOP: separation below 74.6% with 65.4% majority baseline').toBeGreaterThanOrEqual(74.6)
}, 120_000)

describe('L-30 reference-hand classification', () => {
  it('uses the exact 0.2 threshold from the generated index builder', () => {
    const builder = readFileSync(join(process.cwd(), 'scripts/build-reference-index.mjs'), 'utf8')
    const match = builder.match(/const TWO_HAND_FRAME_THRESHOLD = ([\d.]+)/)
    expect(match).not.toBeNull()
    expect(TWO_HAND_FRAME_THRESHOLD).toBe(0.2)
    expect(Number(match![1])).toBe(TWO_HAND_FRAME_THRESHOLD)
  })
  it('ignores a stray second label below 20%, retaining the dominant hand', () => {
    const ref = buildRecording({ frameCount: 10 })
    const noisy = { ...ref, frames: structuredClone(ref.frames) }
    noisy.frames[0].hands.push({ ...noisy.frames[0].hands[0], handedness: 'Left' })
    const result = scoreAttempt(ref, noisy)
    expect(result.hands.map((hand) => hand.handedness)).toEqual(['Right'])
    expect(result.twoHanded).toBe(false)
    expect(result.score).toBe(100)
    expect(result.hints.some((hint) => hint.includes('two-handed'))).toBe(false)
    noisy.frames[1].hands.push({ ...noisy.frames[1].hands[0], handedness: 'Left' })
    expect(scoreAttempt(ref, noisy).twoHanded).toBe(true) // Exactly 20% is two-handed.
  })
  it('uses label presence across frames, not first appearance, and preserves mirroring', () => {
    const right = buildRecording({ frameCount: 10 })
    const left = mirrorRecording(right)
    const noisy = { ...left, frames: structuredClone(left.frames) }
    noisy.frames[0].hands.unshift({ ...right.frames[0].hands[0] })
    expect(referenceHandednessesIn(noisy.frames)).toEqual(['Left'])
    expect(scoreAttempt(left, noisy).score).toBe(100)
    expect(scoreAttempt(right, noisy)).toMatchObject({ score: 100, mirrored: true, twoHanded: false })
    expect(referenceHandednessesIn([])).toEqual([])
    const alternating = [right.frames[0], left.frames[0]]
    expect(referenceHandednessesIn(alternating)).toEqual(['Right']) // Stable tie.
  })
  it('keeps a real mirrored hand comparison when both one-handed scores saturate at zero', () => {
    const reference = buildRecording()
    const attempt = mirrorRecording(buildRecording({ pose: rotatedHand() }))
    const result = scoreAttempt(attempt, reference)
    expect(result.score).toBe(0)
    expect(result.mirrored).toBe(true)
    expect(result.hands[0].missing).toBe(false)
    expect(Number.isFinite(result.normalizedDistance)).toBe(true)
  })
  it('matches every shipped one-handed index entry and preserves two-handed numeric parent results', () => {
    const index = JSON.parse(readFileSync(join(process.cwd(), 'public/reference-index.json'), 'utf8')) as {
      recordings: Array<{ file: string; hands: 1 | 2 }>
    }
    // L-30's numeric baseline is the unchanged isolated-sign corpus.
    index.recordings = index.recordings.filter(meta => !isSentenceReference(meta))
    const refs = index.recordings.map((meta) => JSON.parse(readFileSync(join(process.cwd(), 'public/references', meta.file), 'utf8')) as SignRecording)
    const path = join(L30_EVIDENCE, 'reference-baseline.json')
    const baseline = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) as Array<{
      file: string; indexHands: number; result: ReturnType<typeof numericResult>
    }> : undefined
    let one = 0, two = 0, corrected = 0
    for (let i = 0; i < refs.length; i++) {
      const meta = index.recordings[i]
      const ref = refs[i]
      const result = scoreAttempt(refs[(i + 1) % refs.length], ref)
      if (meta.hands === 1) {
        one++
        expect(result.hands, meta.file).toHaveLength(1)
        expect(result.twoHanded, meta.file).toBe(false)
        if (handednessesIn(ref.frames).length > 1) corrected++
      } else {
        two++
        expect(referenceHandednessesIn(ref.frames), meta.file).toEqual(handednessesIn(ref.frames))
        if (baseline) {
          expect(baseline[i].file).toBe(meta.file)
          expect(numericResult(result), meta.file).toEqual(baseline[i].result)
        }
      }
    }
    console.info(`L-30 index contract: ${one} one-handed, ${two} two-handed, ${corrected} stray-hand references corrected; ${baseline ? 'numeric parent snapshot compared' : 'numeric snapshot absent in CI; hand-selection identity asserted'}`)
    expect(corrected).toBe(78)
    expect(one + two).toBe(501)
  }, 120_000)
})

describe('scoreAttempt — invariances (the key correctness properties)', () => {
  it('scores a recording against itself as a perfect 100', () => {
    const rec = buildRecording()
    const result = scoreAttempt(rec, rec)
    expect(result.score).toBe(100)
    expect(result.hands[0].normalizedDistance).toBeCloseTo(0, 6)
    expect(result.worstJoints[0].deviation).toBeCloseTo(0, 6)
  })

  it('gives an encouraging hint (not finger nags) on a perfect match', () => {
    const rec = buildRecording()
    const hints = scoreAttempt(rec, rec).hints
    expect(hints).toHaveLength(1)
    expect(hints[0]).toBe('Great job! That looks correct.')
    expect(hints.some((h) => /check your/i.test(h))).toBe(false)
  })

  it('is invariant to where the hand is in the frame (translation)', () => {
    const ref = buildRecording()
    const shifted = translate(ref, 0.15, -0.08)
    expect(scoreAttempt(shifted, ref).score).toBe(100)
  })

  it('is invariant to hand size / camera distance (scale)', () => {
    const ref = buildRecording()
    const closer = zoom(ref, 1.6) // same motion, closer to camera (hand + path enlarge)
    expect(scoreAttempt(closer, ref).score).toBe(100)
  })

  it('is invariant to signing speed (time warp)', () => {
    const ref = buildRecording()
    const slow = timeWarp(ref)
    expect(scoreAttempt(slow, ref).score).toBe(100)
  })

  it('is invariant to capture resolution (aspect ratio)', () => {
    const ref = buildRecording({ videoWidth: 1280, videoHeight: 720 })
    const sameMotion4by3 = buildRecording({ videoWidth: 640, videoHeight: 480 })
    // Different aspect ratios distort raw landmarks; correction should recover
    // a near-perfect match for the same underlying motion.
    expect(scoreAttempt(sameMotion4by3, ref).score).toBeGreaterThan(90)
  })
})

describe('scoreAttempt — discrimination', () => {
  it('scores a clearly different handshape far below a self-match', () => {
    const ref = buildRecording({ pose: canonicalHand() })
    const wrongShape = buildRecording({ pose: rotatedHand() })
    const result = scoreAttempt(wrongShape, ref)
    expect(result.score).toBeLessThan(50)
    expect(result.score).toBeLessThan(scoreAttempt(ref, ref).score)
  })

  it('scores a different trajectory below a matching one', () => {
    const ref = buildRecording({ wristPath: (t) => ({ x: 0.4 + 0.2 * t, y: 0.5 }) }) // →
    const wrongPath = buildRecording({ wristPath: (t) => ({ x: 0.5, y: 0.4 + 0.2 * t }) }) // ↓
    const matching = scoreAttempt(ref, ref).score
    expect(scoreAttempt(wrongPath, ref).score).toBeLessThan(matching)
    const result = scoreAttempt(wrongPath, ref)
    expect(result.typedHints).toContainEqual({ kind: 'path' })
    const costs = result.hands[0].contributions!
    expect(costs.shape + costs.traj).toBeCloseTo(result.hands[0].normalizedDistance, 10)
  })

  it('points feedback at the finger that actually deviates', () => {
    const ref = buildRecording({ pose: canonicalHand() })
    // Bend only the index finger (landmarks 5–8) inward.
    const bent = canonicalHand().map((p, i) =>
      i >= 5 && i <= 8 ? { x: p.x * 0.2, y: p.y * 0.2, z: p.z } : p,
    )
    const attempt = buildRecording({ pose: bent })
    const worst = scoreAttempt(attempt, ref).worstJoints[0]
    expect(worst.finger).toBe('index')
  })
})

describe('scoreAttempt — active duration and feedback compatibility', () => {
  it('ignores leading/trailing empty tracking frames when deriving active duration', () => {
    const ref = buildRecording()
    const slow = { ...ref, frames: ref.frames.map((frame) => ({ ...frame, timestampMs: frame.timestampMs * 2 })) }
    slow.frames.unshift({ timestampMs: -1000, hands: [] })
    slow.frames.push({ timestampMs: 9000, hands: [] })
    const result = scoreAttempt(slow, ref)
    expect(result.score).toBe(100) // Timing feedback must never penalize DTW score.
    expect(result.typedHints).toEqual([{ kind: 'timing', ratio: 2, direction: 'slow' }])
    expect(result.hints[0]).toBe('Nice try! But little slow.')
  })
  it('never restores unvalidated corrective finger hints', () => {
    const result = scoreAttempt(buildRecording({ pose: rotatedHand() }), buildRecording())
    expect(result.hints.some((hint) => hint.startsWith('Check your '))).toBe(false)
    expect(result.hints.some((hint) => hint.startsWith('Great job!'))).toBe(false)
  })
  it('handles an empty reference with one typed compatibility hint', () => {
    const result = scoreAttempt(buildRecording(), withoutHands(buildRecording()))
    expect(result.typedHints).toEqual([{ kind: 'untracked-reference' }])
    expect(result.hints).toEqual(['Oops, this sign is not ready yet.'])
  })
})

describe('scoreAttempt — handedness', () => {
  it('accepts a left-dominant learner signing a right-handed reference', () => {
    const ref = buildRecording({ handedness: 'Right' })
    const leftDominant = mirrorRecording(ref) // same sign, mirrored — a valid rendition
    const result = scoreAttempt(leftDominant, ref)
    expect(result.score).toBe(100)
    expect(result.mirrored).toBe(true)
    expect(result.hands.some((h) => h.missing)).toBe(false)
  })

  it('does not flag a mirror when the learner matches the reference hand', () => {
    const ref = buildRecording({ handedness: 'Right' })
    expect(scoreAttempt(ref, ref).mirrored).toBe(false)
  })

  it('tells a learner with no tracked hands about framing, not about two hands', () => {
    const ref = buildRecording() // one-handed
    const result = scoreAttempt(withoutHands(ref), ref)
    expect(result.score).toBe(0)
    expect(result.twoHanded).toBe(false)
    expect(result.hints.some((h) => /two-handed/.test(h))).toBe(false)
    expect(result.hints).toContain('Show your hands, turn the lights on!')
  })
})

describe('scoreAttempt — two-handed signs', () => {
  it('names the learner missing hand after choosing the mirrored alignment', () => {
    const right = buildRecording({ handedness: 'Right' })
    const left = buildRecording({ handedness: 'Left', pose: rotatedHand() })
    const ref = { ...right, frames: right.frames.map((frame, i) => ({
      ...frame, hands: [...frame.hands, ...left.frames[i].hands],
    })) }
    const result = scoreAttempt(mirrorRecording(right), ref)
    expect(result.mirrored).toBe(true)
    expect(result.typedHints).toContainEqual({ kind: 'missing-hand', hand: 'Right' })
    expect(result.hints[0]).toBe('Use your other hand too.')
  })
  it('penalises a one-handed attempt at a two-handed sign', () => {
    const ref = buildRecording()
    // Reference gains a left hand present in every frame.
    ref.frames.forEach((f) => {
      const right = f.hands[0]
      f.hands.push({
        ...right,
        handedness: 'Left',
        landmarks: right.landmarks.map((l) => ({ x: 1 - l.x, y: l.y, z: l.z })),
      })
    })
    const oneHanded = buildRecording() // right hand only
    const result = scoreAttempt(oneHanded, ref)
    expect(result.hands.some((h) => h.missing)).toBe(true)
    expect(result.hints).toContain('Use your other hand too.')
    expect(result.score).toBeLessThan(scoreAttempt(ref, ref).score)
  })
})
