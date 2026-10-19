import { describe, expect, it } from 'vitest'
import { PATH_PAGE_SIZE, pathCurve, pathSlot } from './pathMapLayout'

describe('Path route layout', () => {
  it('keeps nine lessons per page in reading order along a mirrored S', () => {
    expect(PATH_PAGE_SIZE).toBe(9)
    expect(Array.from({ length: 9 }, (_, i) => pathSlot(i))).toEqual([
      { row: 1, column: 1 }, { row: 1, column: 2 }, { row: 1, column: 3 },
      { row: 2, column: 3 }, { row: 2, column: 2 }, { row: 2, column: 1 },
      { row: 3, column: 1 }, { row: 3, column: 2 }, { row: 3, column: 3 },
    ])
    expect(pathSlot(9)).toEqual(pathSlot(0))
    expect(pathSlot(17)).toEqual(pathSlot(8))
  })
  it('draws nothing without at least two visible lessons', () => {
    expect(pathCurve([], 900, true)).toBe('')
    expect(pathCurve([{ x: 100, y: 80 }], 900, false)).toBe('')
  })
  it('turns outside alternate desktop row ends', () => {
    const line = pathCurve([{ x: 148, y: 80 }, { x: 752, y: 80 }, { x: 752, y: 280 }, { x: 148, y: 280 }, { x: 148, y: 480 }], 900, true)
    expect(line).toBe('M 148 80 L 752 80 C 944 80, 944 280, 752 280 L 148 280 C -44 280, -44 480, 148 480')
  })
  it('joins alternating mobile lessons smoothly in their original order', () => {
    expect(pathCurve([{ x: 100, y: 80 }, { x: 240, y: 280 }, { x: 100, y: 480 }], 340, false))
      .toBe('M 100 80 C 100 210, 240 150, 240 280 C 240 410, 100 350, 100 480')
  })
})
