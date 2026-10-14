import { describe, expect, it } from 'vitest'
import { HandLandmarker } from '@mediapipe/tasks-vision'
import { HAND_CONNECTIONS, interpolateHands, wristAnchorFit } from './drawing'
import type { Fit } from './drawing'
import type { TrackedHand } from './types'

// drawing.ts inlines MediaPipe's hand topology so that rendering a skeleton
// does not drag @mediapipe/tasks-vision into the initial bundle. That trade is
// only safe while the inlined copy matches upstream, which is what this asserts.
//
// Importing the library here is deliberate and costs nothing: tests are not
// bundled, so this file creates no edge in the shipped graph.
describe('HAND_CONNECTIONS', () => {
  it('matches MediaPipe HandLandmarker.HAND_CONNECTIONS exactly', () => {
    const upstream = HandLandmarker.HAND_CONNECTIONS.map((c) => [c.start, c.end])
    expect(HAND_CONNECTIONS.map((c) => [...c])).toEqual(upstream)
  })

  it('covers all 21 landmarks, so no joint is left unconnected', () => {
    const touched = new Set(HAND_CONNECTIONS.flatMap(([a, b]) => [a, b]))
    expect(touched.size).toBe(21)
    expect(Math.min(...touched)).toBe(0)
    expect(Math.max(...touched)).toBe(20)
  })
})

describe('wristAnchorFit', () => {
  const hand = (handedness: 'Left' | 'Right', x: number, y: number): TrackedHand => ({
    handedness,
    score: 1,
    landmarks: [{ x, y, z: 0 }, { x: x + 0.05, y: y - 0.1, z: 0 }],
  })
  // Where drawHands puts a normalised point under a fit, in frame units.
  const place = (fit: Fit, p: { x: number; y: number }) => ({
    x: (p.x - fit.cx) * fit.k + 0.5,
    y: (p.y - fit.cy) * fit.k + 0.5,
  })

  it('moves the reference wrist onto the learner wrist of the same hand', () => {
    const ref = [hand('Right', 0.3, 0.6)]
    const live = [hand('Left', 0.9, 0.9), hand('Right', 0.55, 0.4)]
    const fit = wristAnchorFit(ref, live)
    const wrist = place(fit, ref[0].landmarks[0])
    expect(wrist.x).toBeCloseTo(0.55)
    expect(wrist.y).toBeCloseTo(0.4)
    expect(fit.k).toBe(1)
  })

  it('keeps the shape: every landmark moves by the same offset', () => {
    const ref = [hand('Right', 0.3, 0.6), hand('Left', 0.7, 0.6)]
    const fit = wristAnchorFit(ref, [hand('Right', 0.4, 0.5)])
    const a = place(fit, ref[0].landmarks[1])
    const b = place(fit, ref[1].landmarks[0])
    expect(a.x - 0.4).toBeCloseTo(0.05)
    expect(b.x - a.x).toBeCloseTo(0.7 - 0.35)
  })

  it('falls back to any tracked hand when the same hand is not seen', () => {
    const fit = wristAnchorFit([hand('Right', 0.3, 0.6)], [hand('Left', 0.5, 0.5)])
    expect(place(fit, { x: 0.3, y: 0.6 }).x).toBeCloseTo(0.5)
  })

  it('leaves the reference where it was when either side has no hand', () => {
    expect(wristAnchorFit([], [hand('Right', 0.5, 0.5)])).toEqual({ cx: 0.5, cy: 0.5, k: 1 })
    expect(wristAnchorFit([hand('Right', 0.3, 0.6)], [])).toEqual({ cx: 0.5, cy: 0.5, k: 1 })
  })
})

describe('interpolateHands', () => {
  const hand = (handedness: 'Left' | 'Right', x: number): TrackedHand => ({
    handedness,
    score: 1,
    landmarks: [{ x, y: 0.5, z: 0 }, { x: x + 0.1, y: 0.4, z: -0.02 }],
  })

  it('blends each landmark part-way to the same hand in the next frame', () => {
    const [mid] = interpolateHands([hand('Right', 0.2)], [hand('Right', 0.4)], 0.25)
    expect(mid.landmarks[0].x).toBeCloseTo(0.25)
    expect(mid.landmarks[1].x).toBeCloseTo(0.35)
    expect(mid.handedness).toBe('Right')
  })

  it('returns the first frame unchanged at t = 0 and the second hand at t = 1', () => {
    const a = [hand('Right', 0.2)]
    expect(interpolateHands(a, [hand('Right', 0.4)], 0)).toBe(a)
    expect(interpolateHands(a, [hand('Right', 0.4)], 1)[0].landmarks[0].x).toBeCloseTo(0.4)
  })

  it('never blends a hand into or out of existence', () => {
    const a = [hand('Right', 0.2), hand('Left', 0.7)]
    const out = interpolateHands(a, [hand('Right', 0.4)], 0.5)
    expect(out).toHaveLength(2)
    expect(out[1]).toBe(a[1]) // no Left partner: drawn as recorded
    expect(interpolateHands([], [hand('Right', 0.4)], 0.5)).toEqual([])
  })
})
