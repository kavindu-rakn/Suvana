import { describe, expect, it } from 'vitest'
import { nextPracticeSearchResult, practiceSearchViewport } from './practiceSearchNavigation'

describe('Spotlight result navigation', () => {
  it('has no active result for an empty list', () => {
    expect(nextPracticeSearchResult(0, 0, 1)).toBe(-1)
    expect(nextPracticeSearchResult(0, 0, -1)).toBe(-1)
  })
  it('wraps in both directions', () => {
    expect(nextPracticeSearchResult(2, 3, 1)).toBe(0)
    expect(nextPracticeSearchResult(0, 3, -1)).toBe(2)
  })
  it('recovers a selection after the result count changes', () => {
    expect(nextPracticeSearchResult(8, 2, 1)).toBe(0)
    expect(nextPracticeSearchResult(8, 2, -1)).toBe(1)
  })
  it('keeps a one-result search selected', () => {
    expect(nextPracticeSearchResult(0, 1, 1)).toBe(0)
    expect(nextPracticeSearchResult(0, 1, -1)).toBe(0)
  })
})

describe('mobile Spotlight visible viewport', () => {
  it('stays inside a phone viewport before and after keyboard resize', () => {
    for (const height of [844, 480, 320]) {
      const panel = practiceSearchViewport(height, 0)
      expect(panel.top).toBeGreaterThanOrEqual(0)
      expect(panel.top + panel.maxHeight).toBeLessThanOrEqual(height - 16)
    }
  })
  it('follows the visible viewport when the browser pans a focused field', () => {
    const panel = practiceSearchViewport(400, 120)
    expect(panel.top).toBe(168)
    expect(panel.top + panel.maxHeight).toBeLessThanOrEqual(520)
  })
})
