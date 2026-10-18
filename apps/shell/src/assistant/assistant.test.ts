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

import { norm, ratio, tokens } from './kb'
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
