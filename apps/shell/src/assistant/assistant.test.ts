/**
 * The assistant's pure logic.
 *
 * Two things here are worth guarding. The retrieval is a port of the Python
 * engine in `services/recognition/webapp/assistant.py` and is supposed to be
 * numerically identical to it, which is the kind of claim that rots silently.
 * And `pickModel` exists because Google retires model ids — it is the code
 * that runs on the day the assistant would otherwise break, so it can never
 * be exercised by simply using the app.
 *
 * It is imported from `model.ts`, the half that has no environment
 * assumptions: the same file runs in the browser and inside the serverless
 * function that holds Suvana's key, so these tests cover both routes.
 */

import { describe, expect, it } from 'vitest'

import { SignKnowledgeBase, norm, ratio, tokens } from './kb'
import { localAnswer, stripQuery } from './engine'
import { PREFERRED_MODEL, pickModel } from './model'

describe('ratio — difflib.SequenceMatcher parity', () => {
  // Expected values produced by CPython:
  //   difflib.SequenceMatcher(None, a, b).ratio()
  // A cheaper edit-distance stand-in would change which sign wins a fuzzy
  // query, so parity is the actual requirement, not "close enough".
  const CASES: Array<[string, string, number]> = [
    ['adinwa', 'adinawa', 0.9230769230769231],
    ['eat', 'kanawa', 0.2222222222222222],
    ['go', 'yanawa', 0],
    ['', '', 1],
    ['abc', 'abc', 1],
    ['abc', '', 0],
    ['kitten', 'sitting', 0.6153846153846154],
    ['to eat', 'to eat quickly', 0.6],
    ['xyz', 'abc', 0],
    ['aaa', 'aaaa', 0.8571428571428571],
  ]

  it.each(CASES)('ratio(%j, %j) === %f', (a, b, expected) => {
    expect(ratio(a, b)).toBeCloseTo(expected, 12)
  })

  it('is symmetric', () => {
    expect(ratio('adinwa', 'adinawa')).toBeCloseTo(ratio('adinawa', 'adinwa'), 12)
  })
})

describe('norm and tokens', () => {
  it('keeps Sinhala script and drops punctuation', () => {
    // Two spaces before "to", not one: the space before the apostrophe is kept
    // and the apostrophe itself becomes another. That is exactly what the
    // Python `re.sub(r"[^a-z0-9඀-෿ ]+", " ", ...)` produces, so it is pinned
    // here rather than tidied — parity is the requirement. `tokens` drops the
    // empty string it creates, so nothing downstream ever sees it.
    expect(norm("How do I sign 'to eat'?")).toBe('how do i sign  to eat')
    expect(norm('කනවා')).toBe('කනවා')
  })

  it('drops the empty strings that repeated separators produce', () => {
    expect(tokens('a  --  b')).toEqual(['a', 'b'])
    expect(tokens("How do I sign 'to eat'?")).toEqual(['how', 'do', 'i', 'sign', 'to', 'eat'])
  })
})

// A slice of the committed index, enough to exercise every branch.
const KB = new SignKnowledgeBase([
  { label: 'kanawa', sinhala: 'කනවා', category: 'phrase', english: 'to eat' },
  { label: 'yanawa', sinhala: 'යනවා', category: 'phrase', english: 'to go' },
  { label: 'adinawa', sinhala: 'අදිනවා', category: 'phrase', english: 'to pull' },
  { label: '50 KM idiriyata yanna', sinhala: '50 කම් ඉදිරියට යන්න', category: 'phrase', english: '' },
  { label: 'K(first way)', sinhala: 'K', category: 'letter', english: '' },
  { label: '100', sinhala: 'සියය', category: 'number', english: 'one hundred' },
])

describe('SignKnowledgeBase.search', () => {
  it('finds a sign by its English meaning', () => {
    expect(KB.search('eat')[0].label).toBe('kanawa')
  })

  it('finds a sign by Romanised Sinhala', () => {
    expect(KB.search('kanawa')[0].label).toBe('kanawa')
  })

  it('finds a sign by Sinhala script', () => {
    expect(KB.search('යනවා')[0].label).toBe('yanawa')
  })

  it('tolerates a typo', () => {
    expect(KB.search('adinwa')[0].label).toBe('adinawa')
  })

  it('prefers the concise canonical sign over a long phrase containing it', () => {
    // Without the length tie-break, "50 KM idiriyata yanna" outranks "yanawa".
    expect(KB.search('go')[0].label).toBe('yanawa')
  })

  it('returns nothing for a query unrelated to the dataset', () => {
    // The MIN_SCORE floor. Fuzzy matching will always find *something*, and a
    // confidently wrong sign is the worst failure mode for a teaching tool.
    expect(KB.search('quantum physics')).toEqual([])
    expect(KB.search('pizza delivery')).toEqual([])
  })

  it('reports its own size honestly', () => {
    expect(KB.size).toBe(6)
    expect(KB.statsLine()).toContain('6 signs in total')
  })
})

describe('stripQuery', () => {
  it('reduces a natural question to the thing being asked about', () => {
    expect(stripQuery('how do I sign to eat?')).toBe('eat')
    expect(stripQuery('what does gannawa mean?')).toBe('gannawa')
  })

  it('keeps a single letter that STOPWORDS would otherwise swallow', () => {
    expect(stripQuery('how do I sign the letter A')).toBe('a')
    expect(stripQuery('sign K')).toBe('k')
  })
})

describe('localAnswer', () => {
  it('greets, and states the real dataset size', () => {
    const a = localAnswer(KB, 'hello')
    expect(a.text).toContain('6')
    expect(a.cards).toEqual([])
  })

  it('answers a sign lookup with a card', () => {
    const a = localAnswer(KB, 'how do I sign to eat?')
    expect(a.text).toContain('කනවා')
    expect(a.cards[0].label).toBe('kanawa')
    expect(a.cards[0].tips.length).toBeGreaterThan(0)
  })

  it('lists a category', () => {
    const a = localAnswer(KB, 'show me the numbers')
    expect(a.cards.map((c) => c.label)).toEqual(['100'])
  })

  it('declines a question the dataset cannot answer', () => {
    const a = localAnswer(KB, 'what is quantum physics')
    expect(a.text).toContain("couldn’t match")
    expect(a.cards).toEqual([])
  })

  it('says so plainly when the index failed to load, rather than claiming zero signs', () => {
    const a = localAnswer(new SignKnowledgeBase([]), 'how do I sign to eat?')
    expect(a.text).toContain('sign index')
    expect(a.cards).toEqual([])
  })

  it('never emits a sub-brand name', () => {
    for (const q of ['hello', 'what can you do', 'how many signs do you know?', 'practice tips']) {
      expect(localAnswer(KB, q).text).not.toMatch(/sawana|signspeak|soundguard/i)
    }
  })
})

describe('pickModel', () => {
  it('takes the preferred model when the key can reach it', () => {
    expect(pickModel(PREFERRED_MODEL, ['gemini-3.5-flash', PREFERRED_MODEL])).toBe(PREFERRED_MODEL)
  })

  it('falls to another flash-lite before a full flash', () => {
    expect(pickModel(PREFERRED_MODEL, ['gemini-3.6-flash', 'gemini-3.6-flash-lite'])).toBe(
      'gemini-3.6-flash-lite',
    )
  })

  it('falls to flash when no flash-lite exists', () => {
    expect(pickModel(PREFERRED_MODEL, ['gemini-3.6-flash', 'gemini-3.6-pro'])).toBe('gemini-3.6-flash')
  })

  it('prefers a stable newer model over a dated preview of the preferred one', () => {
    // A preview build is the thing most likely to be withdrawn next, which is
    // the failure this function exists to absorb.
    expect(
      pickModel(PREFERRED_MODEL, [
        'gemini-3.5-flash-lite-preview-09-2025',
        'gemini-3.6-flash-lite',
        'gemini-3.6-flash',
      ]),
    ).toBe('gemini-3.6-flash-lite')
  })

  it('still uses a preview when it is the only thing available', () => {
    expect(pickModel(PREFERRED_MODEL, ['gemini-3.5-flash-lite-preview-09-2025'])).toBe(
      'gemini-3.5-flash-lite-preview-09-2025',
    )
  })

  it('takes the highest version within a tier', () => {
    expect(pickModel(PREFERRED_MODEL, ['gemini-2.0-flash', 'gemini-3.6-flash', 'gemini-1.5-flash'])).toBe(
      'gemini-3.6-flash',
    )
  })

  it('returns null when nothing usable is offered', () => {
    expect(pickModel(PREFERRED_MODEL, ['embedding-001', 'aqa'])).toBeNull()
    expect(pickModel(PREFERRED_MODEL, [])).toBeNull()
  })
})
