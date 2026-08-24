import { describe, expect, it } from 'vitest'
import {
  RUBRIC_WEIGHTS,
  appropriatenessScore,
  combineRubric,
  fluencyScore,
  scoreTurn,
} from './rubric'
import { buildRecording, canonicalHand, rotatedHand } from '../scoring/testFixtures'

describe('rubric weights', () => {
  it('sums to 1 with the non-manual-marker share folded into accuracy', () => {
    const sum = Object.values(RUBRIC_WEIGHTS).reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(1, 10)
    // Proposal accuracy is 40%; the unscoreable 10% for non-manual markers moves here.
    expect(RUBRIC_WEIGHTS.accuracy).toBeCloseTo(0.5, 10)
  })
})

describe('fluencyScore', () => {
  it('gives full marks at reference pace', () => {
    expect(fluencyScore(2000, 2000)).toBe(100)
  })

  it('tolerates small pace differences', () => {
    expect(fluencyScore(2200, 2000)).toBe(100)
  })

  it('penalises fast and slow symmetrically', () => {
    expect(fluencyScore(4000, 2000)).toBe(fluencyScore(1000, 2000))
  })

  it('drops toward zero at extreme pace differences', () => {
    expect(fluencyScore(6000, 2000)).toBe(0)
    expect(fluencyScore(500, 2000)).toBe(0)
  })

  it('reports null rather than 0 when duration data is missing', () => {
    expect(fluencyScore(0, 2000)).toBeNull()
    expect(fluencyScore(2000, 0)).toBeNull()
  })
})

describe('appropriatenessScore', () => {
  it('gives full marks when the target clearly beats other signs', () => {
    expect(appropriatenessScore(90, 40)).toBe(100)
  })

  it('gives zero when another sign clearly matched better', () => {
    expect(appropriatenessScore(40, 90)).toBe(0)
  })

  it('sits at the midpoint when two signs match equally well', () => {
    expect(appropriatenessScore(70, 70)).toBe(50)
  })
})

describe('combineRubric', () => {
  it('weights measured components per the rubric', () => {
    const r = combineRubric({ accuracy: 100, appropriateness: 0, fluency: 0 })
    expect(r.total).toBe(50) // 100 * 0.5
    expect(r.unmeasured).toEqual([])
  })

  it('redistributes an unmeasurable component instead of scoring it zero', () => {
    // Only one reference exists, so appropriateness cannot be judged.
    const r = combineRubric({ accuracy: 100, appropriateness: null, fluency: 100 })
    expect(r.total).toBe(100) // must not be dragged down by the missing part
    expect(r.unmeasured).toEqual(['appropriateness'])
    expect(r.effectiveWeights.accuracy).toBeCloseTo(0.5 / 0.7, 10)
    expect(r.effectiveWeights.fluency).toBeCloseTo(0.2 / 0.7, 10)
  })

  it('still scores when only accuracy is available', () => {
    const r = combineRubric({ accuracy: 80, appropriateness: null, fluency: null })
    expect(r.total).toBe(80)
    expect(r.unmeasured).toEqual(['appropriateness', 'fluency'])
  })
})

describe('scoreTurn', () => {
  const target = buildRecording({ gloss: 'ME', pose: canonicalHand() })
  const other = buildRecording({ gloss: 'YOU', pose: rotatedHand() })

  it('scores a correct, well-paced attempt highly across the rubric', () => {
    const result = scoreTurn(target, target, [other])
    expect(result.rubric.accuracy).toBe(100)
    expect(result.rubric.fluency).toBe(100)
    expect(result.rubric.appropriateness).toBe(100)
    expect(result.rubric.total).toBe(100)
    expect(result.bestMatchGloss).toBe('ME')
  })

  it('flags when the learner signed a different sign from the library', () => {
    // Learner performs YOU while the turn asked for ME.
    const result = scoreTurn(other, target, [other])
    expect(result.bestMatchGloss).toBe('YOU')
    expect(result.rubric.appropriateness).toBe(0)
    expect(result.rubric.total).toBeLessThan(50)
  })

  it('marks appropriateness unmeasurable when nothing else is in the library', () => {
    const result = scoreTurn(target, target, [])
    expect(result.rubric.appropriateness).toBeNull()
    expect(result.rubric.unmeasured).toEqual(['appropriateness'])
    expect(result.rubric.total).toBe(100)
  })

  it('penalises pace without touching the accuracy score', () => {
    // Same motion, but the reference take is much shorter than the attempt.
    const quickReference = { ...target, durationMs: 500 }
    const result = scoreTurn(target, quickReference, [])
    expect(result.rubric.accuracy).toBe(100) // DTW absorbs speed by design
    expect(result.rubric.fluency).toBe(0) // pace is judged here instead
    expect(result.rubric.total).toBeLessThan(100)
  })
})
