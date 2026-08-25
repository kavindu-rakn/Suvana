import { describe, expect, it } from 'vitest'
import { HandLandmarker } from '@mediapipe/tasks-vision'
import { HAND_CONNECTIONS } from './drawing'

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
