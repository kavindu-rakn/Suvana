import { describe, expect, it } from 'vitest'
import { pathCurve, pathSlot } from './pathMapLayout'

describe('Path route layout', () => {
  it('continues the mirrored S down every row without resetting after nine lessons', () => {
    expect(Array.from({ length: 9 }, (_, i) => pathSlot(i))).toEqual([
      { row: 1, column: 1 }, { row: 1, column: 2 }, { row: 1, column: 3 },
      { row: 2, column: 3 }, { row: 2, column: 2 }, { row: 2, column: 1 },
      { row: 3, column: 1 }, { row: 3, column: 2 }, { row: 3, column: 3 },
    ])
    expect(pathSlot(9)).toEqual({ row: 4, column: 3 })
    expect(pathSlot(17)).toEqual({ row: 6, column: 1 })
    expect(pathSlot(53)).toEqual({ row: 18, column: 1 })
  })
  it('draws nothing without at least two visible lessons', () => {
    expect(pathCurve([], 900, true)).toBe('')
    expect(pathCurve([{ x: 100, y: 80, width: 200 }], 900, false)).toBe('')
  })
  it('turns outside alternate desktop row ends', () => {
    const line = pathCurve([{ x: 148, y: 80, width: 200 }, { x: 752, y: 80, width: 200 }, { x: 752, y: 280, width: 200 }, { x: 148, y: 280, width: 200 }, { x: 148, y: 480, width: 200 }], 900, true)
    expect(line).toBe('M 148 80 L 752 80 L 852 80 H 858 Q 894 80, 894 116 V 244 Q 894 280, 858 280 H 852 L 752 280 L 148 280 L 48 280 H 42 Q 6 280, 6 316 V 444 Q 6 480, 42 480 H 48 L 148 480')
  })
  it('connects mobile side midpoints with horizontal tangents and crosses card centres', () => {
    expect(pathCurve([{ x: 120, y: 80, width: 200 }, { x: 220, y: 284, width: 200 }, { x: 120, y: 488, width: 200 }], 340, false))
      .toBe('M 120 80 L 220 80 H 320 Q 334 80, 334 94 V 270 Q 334 284, 320 284 H 320 L 220 284 L 120 284 H 20 Q 6 284, 6 298 V 474 Q 6 488, 20 488 H 20 L 120 488')
  })
})
