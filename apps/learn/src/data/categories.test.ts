import { describe, expect, it } from 'vitest'
import { foldedCategoryOf, groupForPicker, MY_RECORDINGS } from './categories'

interface Ref {
  gloss: string
  source?: string
  sourceCategory?: string
}

/** `n` references filed under `category`. */
function refs(category: string | undefined, n: number, source?: string): Ref[] {
  return Array.from({ length: n }, (_, i) => ({
    gloss: `${category ?? 'NONE'}_${i}`,
    sourceCategory: category,
    source,
  }))
}

describe('groupForPicker', () => {
  it('orders categories by size, largest first', () => {
    const { order } = groupForPicker([
      ...refs('Nouns', 5),
      ...refs('Verbs', 9),
      ...refs('Colors', 7),
    ])
    expect(order).toEqual(['Verbs', 'Colors', 'Nouns'])
  })

  it('breaks size ties alphabetically, so the order is stable', () => {
    const { order } = groupForPicker([...refs('Zebra', 4), ...refs('Alpha', 4)])
    expect(order).toEqual(['Alpha', 'Zebra'])
  })

  it('folds categories smaller than three signs into Other', () => {
    const { order, byCategory } = groupForPicker([
      ...refs('Verbs', 9),
      ...refs('Conjunctions', 1),
      ...refs('Determiner', 1),
      ...refs('Interjection', 2),
    ])
    expect(order).toEqual(['Verbs', 'Other'])
    expect(byCategory.get('Other')).toHaveLength(4)
    expect(byCategory.has('Conjunctions')).toBe(false)
  })

  it('keeps a category of exactly three', () => {
    const { order } = groupForPicker([...refs('Verbs', 9), ...refs('Greetings', 3)])
    expect(order).toEqual(['Verbs', 'Greetings'])
  })

  it('pins Other and the learner\u2019s own recordings to the end, however large', () => {
    const { order } = groupForPicker([
      ...refs('Verbs', 2), // folds into Other
      ...refs('Nouns', 4),
      ...refs(undefined, 30), // already Other
      ...refs('anything', 50, 'team-recording'),
    ])
    expect(order).toEqual(['Nouns', 'Other', MY_RECORDINGS])
  })

  it('never loses a reference', () => {
    const input = [
      ...refs('Verbs', 9),
      ...refs('Conjunctions', 1),
      ...refs('X', 50, 'team-recording'),
    ]
    const { byCategory } = groupForPicker(input)
    const total = [...byCategory.values()].reduce((n, list) => n + list.length, 0)
    expect(total).toBe(input.length)
  })

  it('groups every team recording together regardless of its dataset folder', () => {
    const { byCategory } = groupForPicker([
      ...refs('Verbs', 3, 'team-recording'),
      ...refs('Nouns', 2, 'team-recording'),
    ])
    expect(byCategory.get(MY_RECORDINGS)).toHaveLength(5)
  })
})

describe('foldedCategoryOf', () => {
  it('reports the real category a folded sign came from', () => {
    expect(foldedCategoryOf({ sourceCategory: 'Conjunctions' })).toBe('Conjunctions')
  })

  it('reports nothing for a sign that has no category of its own', () => {
    expect(foldedCategoryOf({})).toBeNull()
  })
})
