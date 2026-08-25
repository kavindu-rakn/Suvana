import { describe, expect, it } from 'vitest'
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
    expect(hints[0]).toMatch(/close match/i)
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
    expect(result.hints.some((h) => /framing and lighting/.test(h))).toBe(true)
  })
})

describe('scoreAttempt — two-handed signs', () => {
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
    expect(result.hints.some((h) => /two-handed/.test(h))).toBe(true)
    expect(result.score).toBeLessThan(scoreAttempt(ref, ref).score)
  })
})
