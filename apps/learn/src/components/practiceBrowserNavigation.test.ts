import { describe, expect, it } from 'vitest'
import { practiceReturnCategory } from './practiceBrowserNavigation'

// Grouping-only fixtures contain no invented SSL labels or motion content.
const verbs = [1, 2, 3].map((id) => ({ id: `verb-${id}`, sourceCategory: 'Verbs' }))

describe('practice browser return destination', () => {
  it('returns to the displayed category for the selected reference', () => {
    expect(practiceReturnCategory(verbs[1], verbs)).toBe('Verbs')
  })
  it('returns to Other when the corpus category is folded into it', () => {
    const folded = { id: 'folded', sourceCategory: 'Conjunctions' }
    expect(practiceReturnCategory(folded, [...verbs, folded])).toBe('Other')
  })
  it('returns local recordings to their displayed group', () => {
    const local = { id: 'local', source: 'team-recording', sourceCategory: 'Verbs' }
    expect(practiceReturnCategory(local, [...verbs, local])).toBe('My recordings')
  })
  it('uses the available index rather than guessing a missing destination', () => {
    expect(practiceReturnCategory({ id: 'unavailable', sourceCategory: 'Verbs' }, verbs)).toBeNull()
  })
  it('starts at all categories without a selected reference', () => {
    expect(practiceReturnCategory(null, verbs)).toBeNull()
  })
})
