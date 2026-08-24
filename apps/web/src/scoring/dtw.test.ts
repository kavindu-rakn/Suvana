import { describe, expect, it } from 'vitest'
import { dtw } from './dtw'

const absCost = (a: number[], b: number[]) => (i: number, j: number) => Math.abs(a[i] - b[j])

describe('dtw', () => {
  it('gives zero distance and a diagonal path for identical sequences', () => {
    const a = [1, 2, 3, 4]
    const res = dtw(a.length, a.length, absCost(a, a))
    expect(res.distance).toBe(0)
    expect(res.path).toEqual([
      [0, 0],
      [1, 1],
      [2, 2],
      [3, 3],
    ])
  })

  it('absorbs time stretching (repeated elements) with zero cost', () => {
    const a = [1, 2, 3]
    const b = [1, 1, 2, 3, 3] // same shape, slower
    const res = dtw(a.length, b.length, absCost(a, b))
    expect(res.distance).toBe(0)
    expect(res.normalizedDistance).toBe(0)
  })

  it('returns a positive cost for differing sequences', () => {
    const a = [0, 0, 0]
    const b = [0, 5, 0]
    const res = dtw(a.length, b.length, absCost(a, b))
    expect(res.distance).toBeGreaterThan(0)
  })

  it('treats an empty sequence as infinitely far', () => {
    const res = dtw(0, 3, () => 1)
    expect(res.distance).toBe(Infinity)
    expect(res.path).toEqual([])
  })
})
