import { describe, expect, it } from 'vitest'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { SignRecording } from '../vision/types'
import { scoreAttempt } from './score'
import { buildRecording, mirrorRecording, timeWarp, withoutHands } from './testFixtures'

const evidence = join(process.cwd(), '../../.agent-local/evidence/L-18')

// Opt-in before/after measurement on the same 40 shipped references and fixed
// 150-frame attempts. Writes metrics only to ignored local evidence.
it.skipIf(!process.env.L18_MEASURE_PHASE)('L-18 scoring benchmark and numeric regression', () => {
  const phase = process.env.L18_MEASURE_PHASE!
  expect(['before', 'after']).toContain(phase)
  const names = JSON.parse(readFileSync('public/reference-index.json', 'utf8')).recordings as Array<{ file: string }>
  const pairs = Array.from({ length: Math.min(40, names.length) }, (_, i) => {
    const name = names[Math.floor(i * names.length / Math.min(40, names.length))].file
    const reference = JSON.parse(readFileSync(join('public/references', name), 'utf8')) as SignRecording
    const attempt = { ...reference, frames: Array.from({ length: 150 }, (_, index) => ({
      ...reference.frames[index % reference.frames.length], timestampMs: index * 1000 / 30,
    })), durationMs: 5000, fps: 30 }
    return { name, reference, attempt }
  })
  const numeric = pairs.map(({ name, reference, attempt }) => {
    const result = scoreAttempt(attempt, reference)
    return { name, score: result.score, normalizedDistance: result.normalizedDistance,
      hands: result.hands, worstJoints: result.worstJoints, typedHints: result.typedHints,
      hints: result.hints, mirrored: result.mirrored, twoHanded: result.twoHanded }
  })
  for (let warmup = 0; warmup < 4; warmup++) {
    for (const { reference, attempt } of pairs) scoreAttempt(attempt, reference)
  }
  const timings = pairs.map(({ reference, attempt }) => {
    const runs = Array.from({ length: 9 }, () => {
      const start = performance.now()
      scoreAttempt(attempt, reference)
      return performance.now() - start
    }).sort((a, b) => a - b)
    return runs[4]
  }).sort((a, b) => a - b)
  const mid = Math.floor(timings.length / 2)
  const metrics = { phase, references: pairs.length, repeats: 9,
    medianMs: timings.length % 2 ? timings[mid] : (timings[mid - 1] + timings[mid]) / 2 }
  mkdirSync(evidence, { recursive: true })
  writeFileSync(join(evidence, `${phase}.json`), JSON.stringify({ metrics, numeric }))
  console.info(JSON.stringify(metrics))
  if (phase === 'after' && existsSync(join(evidence, 'before.json'))) {
    const before = JSON.parse(readFileSync(join(evidence, 'before.json'), 'utf8'))
    expect(JSON.parse(JSON.stringify(numeric))).toEqual(before.numeric)
    expect(metrics.medianMs).toBeLessThanOrEqual(before.metrics.medianMs * 1.1)
  }
})

describe('replay alignment', () => {
  const stationary = (frameCount = 6) => buildRecording({ frameCount,
    wristPath: () => ({ x: 0.5, y: 0.5 }) })

  it('exports a diagonal path in reference/attempt order, with the earliest worst tie', () => {
    const reference = stationary()
    const result = scoreAttempt(reference, reference)
    expect(result.alignment).toEqual(Array.from({ length: 6 }, (_, index) => [index, index]))
    expect(result.worstFrameIndex).toBe(0)
    expect(result.score).toBe(100)
  })

  it('keeps repeated reference indices for a slower attempt', () => {
    const reference = buildRecording()
    const attempt = timeWarp(reference)
    const result = scoreAttempt(attempt, reference)
    expect(result.alignment![0]).toEqual([0, 0])
    expect(result.alignment!.at(-1)).toEqual([39, 79])
    expect(result.alignment!.length).toBe(80)
    expect(result.alignment!.every(([ri, ai], index, path) => index === 0 ||
      (ri >= path[index - 1][0] && ai >= path[index - 1][1]))).toBe(true)
    expect(new Set(result.alignment!.map(([ri]) => ri)).size).toBe(40)
    expect(result.score).toBe(100)
  })

  it('reports the known worst attempt frame for an isolated shape error', () => {
    const reference = stationary()
    const attempt = structuredClone(reference)
    attempt.frames[3].hands[0].landmarks[4].x += 0.3
    expect(scoreAttempt(attempt, reference).worstFrameIndex).toBe(3)
  })

  it('remaps no-hand and malformed-hand gaps to original frame indices', () => {
    const reference = stationary(5)
    const attempt = stationary(5)
    reference.frames[0].hands = []
    reference.frames[2].hands = []
    attempt.frames[0].hands = []
    attempt.frames[1].hands[0].landmarks = attempt.frames[1].hands[0].landmarks.slice(0, 1)
    attempt.frames[3].hands[0].landmarks[4].x += 0.3
    const result = scoreAttempt(attempt, reference)
    expect(result.alignment).toEqual([[1, 2], [3, 3], [4, 4]])
    expect(result.worstFrameIndex).toBe(3)
  })

  it('maps the winning mirrored hand back to the original attempt', () => {
    const reference = stationary()
    const attempt = mirrorRecording(reference)
    attempt.frames[0].hands = []
    attempt.frames[4].hands[0].landmarks[4].x -= 0.3
    const result = scoreAttempt(attempt, reference)
    expect(result.mirrored).toBe(true)
    expect(result.alignment![0]).toEqual([0, 1])
    expect(result.alignment!.at(-1)).toEqual([5, 5])
    expect(result.worstFrameIndex).toBe(4)
  })

  it('uses the tracked reference hand with the most frames for two-hand replay', () => {
    const reference = stationary(8)
    const left = mirrorRecording(reference)
    reference.frames.forEach((frame, index) => {
      if (index >= 2) frame.hands.push(left.frames[index].hands[0])
    })
    const attempt = structuredClone(reference)
    attempt.frames[0].hands = []
    attempt.frames[1].hands = []
    const result = scoreAttempt(attempt, reference)
    expect(result.twoHanded).toBe(true)
    expect(result.mirrored).toBe(false)
    expect(result.alignment![0]).toEqual([0, 2])
    expect(result.alignment!.at(-1)).toEqual([7, 7])
  })

  it('keeps first reference-hand appearance when two tracked hands tie', () => {
    const reference = stationary()
    const left = mirrorRecording(reference)
    reference.frames.forEach((frame, index) => frame.hands.unshift(left.frames[index].hands[0]))
    const attempt = structuredClone(reference)
    attempt.frames[0].hands = attempt.frames[0].hands.filter((hand) => hand.handedness === 'Right')
    const result = scoreAttempt(attempt, reference)
    expect(result.mirrored).toBe(false)
    expect(result.alignment![0]).toEqual([0, 1]) // Left remains the replay clock.
  })

  it('omits replay data when the attempt or reference has no valid tracking', () => {
    const reference = stationary()
    for (const result of [scoreAttempt(withoutHands(reference), reference),
      scoreAttempt(reference, withoutHands(reference)),
      scoreAttempt({ ...reference, frames: [] }, reference)]) {
      expect(result.alignment).toBeUndefined()
      expect(result.worstFrameIndex).toBeUndefined()
    }
  })

  it('does not mutate recording frames while producing replay data', () => {
    const reference = stationary()
    const attempt = mirrorRecording(reference)
    const before = structuredClone({ attempt, reference })
    scoreAttempt(attempt, reference)
    expect({ attempt, reference }).toEqual(before)
  })
})
