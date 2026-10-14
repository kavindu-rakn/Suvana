import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { CURRICULUM_UNITS, getStarterUnit, getUnit } from './curriculum'
import { translationOf } from './translations'
import indexRaw from '../../public/reference-index.json'

interface Reference {
  gloss: string
  file?: string
  sourceCategory?: string
  hands?: number
  motion?: string
  durationMs?: number
}

const sources = indexRaw.sources as Record<string, Partial<Reference>>
const recordings: Reference[] = indexRaw.recordings.map(r => ({
  ...(r.source ? sources[r.source] : {}), ...r,
}))
const months = new Set(['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'])
const groupTitle = (title: string) => title.replace(/ \d+$/, '')
const order = [
  'Starter', 'Greetings', 'First numbers', 'Restaurant', 'Everyday words and directions',
  'Letters A-M', 'Letters N-Z', 'Numbers 30-90', 'Days', 'Months', 'Colours',
  'People and family', 'Places', 'Transport', 'Big numbers', 'Action words',
  'Things', 'Describing words', 'Time words', 'Position words', 'Small words',
]

function compare(a: Reference, b: Reference): number {
  const rank = (r: Reference) => (r.hands === 1 ? 0 : 2) + (r.motion === 'still' ? 0 : 1)
  return rank(a) - rank(b) || (a.durationMs || 0) - (b.durationMs || 0)
    || a.gloss.localeCompare(b.gloss)
}

const naturalGroups = new Set(['Letters A-M', 'Letters N-Z', 'First numbers',
  'Numbers 30-90', 'Days', 'Months', 'Big numbers'])
const signsIn = (title: string) => CURRICULUM_UNITS
  .filter(unit => groupTitle(unit.title) === title).flatMap(unit => unit.signs)
const weekdays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']

describe('approved curriculum', () => {
  it('uses the approved group order and keeps split parts together', () => {
    const titles = CURRICULUM_UNITS.map(unit => groupTitle(unit.title))
    expect([...new Set(titles)]).toEqual(order)
    for (let i = 1; i < titles.length; i++) {
      expect(order.indexOf(titles[i])).toBeGreaterThanOrEqual(order.indexOf(titles[i - 1]))
    }
  })

  it('caps units at twelve with only the approved thirteen-letter A-M exception', () => {
    expect(new Set(CURRICULUM_UNITS.map(unit => unit.id)).size).toBe(CURRICULUM_UNITS.length)
    for (const unit of CURRICULUM_UNITS) {
      expect(unit.status).toBe('approved')
      expect(unit.title).toBeTruthy()
      expect(unit.description).toBeTruthy()
      expect(unit.signs.length).toBeGreaterThan(0)
      expect(unit.signs.length).toBeLessThanOrEqual(unit.id === 'u-alphabet-part1' ? 13 : 12)
      expect(new Set(unit.signs).size).toBe(unit.signs.length)
    }
    const exceptions = CURRICULUM_UNITS.filter(unit => unit.signs.length > 12)
    expect(exceptions).toHaveLength(1)
    expect(exceptions[0].id).toBe('u-alphabet-part1')
    expect(exceptions[0].title).toBe('Letters A-M')
    expect(exceptions[0].signs).toHaveLength(13)
  })

  it('contains every corpus sign without adding or renaming a gloss', () => {
    const actual = [...new Set(CURRICULUM_UNITS.flatMap(unit => unit.signs))].sort()
    const expected = [...new Set(recordings.map(r => r.gloss))].sort()
    expect(actual).toEqual(expected)
  })

  it('preserves category membership and balanced splitting, and measured order for other groups', () => {
    for (const title of order.filter(name => name !== 'Starter' && name !== 'Restaurant')) {
      const parts = CURRICULUM_UNITS.filter(unit => groupTitle(unit.title) === title)
      const category = parts[0].sourceCategory
      let refs = recordings.filter(r => category === 'Other'
        ? ['Determiner', 'Conjunctions', 'Interjection'].includes(r.sourceCategory || '')
        : r.sourceCategory === category)
      if (title === 'Letters A-M') refs = refs.filter(r => r.gloss <= 'M')
      if (title === 'Letters N-Z') refs = refs.filter(r => r.gloss > 'M')
      const expected = [...new Map(refs.map(r => [r.gloss, r])).values()].sort(compare)
      const actualSigns = parts.flatMap(unit => unit.signs)
      expect([...actualSigns].sort(), title).toEqual(expected.map(r => r.gloss).sort())
      if (!naturalGroups.has(title)) expect(actualSigns, title).toEqual(expected.map(r => r.gloss))
      const sizes = parts.map(unit => unit.signs.length)
      expect(Math.max(...sizes) - Math.min(...sizes), title).toBeLessThanOrEqual(1)
      if (expected.length > 12 && title !== 'Letters A-M') expect(parts.length, title).toBeGreaterThan(1)
      else expect(parts, title).toHaveLength(1)
    }
  })

  it('keeps both letter units together in alphabetical order without adding N', () => {
    expect(signsIn('Letters A-M')).toEqual([... 'ABCDEFGHIJKLM'])
    expect(signsIn('Letters N-Z')).toEqual([... 'OPQRSTUVWXYZ'])
    expect(CURRICULUM_UNITS.filter(unit => unit.sourceCategory === 'A-Z')).toHaveLength(2)
  })

  it('puts weekdays first and preserves the remaining day words in their current measured order', () => {
    const otherDays = [...new Map(recordings.filter(r => r.sourceCategory === 'Days')
      .map(r => [r.gloss, r])).values()].sort(compare)
      .map(r => r.gloss).filter(gloss => !weekdays.includes(gloss))
    expect(signsIn('Days')).toEqual([...weekdays, ...otherDays])
  })

  it('uses calendar month order, then MONTH, YEAR and the existing unverified MRACH', () => {
    expect(signsIn('Months')).toEqual([...months, 'MONTH', 'YEAR', 'MRACH'])
  })

  it('uses numeric order across number-unit splits with the existing word labels last', () => {
    expect(signsIn('First numbers')).toEqual(['1', '2', '4', '5', 'EQUAL'])
    expect(signsIn('Numbers 30-90')).toEqual(['30', '40', '50', '60', '70', '80', '90'])
    const bigNumbers = signsIn('Big numbers')
    expect(bigNumbers.at(-1)).toBe('MILIYANAYA')
    expect(bigNumbers[0]).toBe('100')
    const numeric = bigNumbers.slice(0, -1)
    expect(numeric.every(gloss => /^\d+$/.test(gloss))).toBe(true)
    expect(numeric).toEqual([...numeric].sort((a, b) => Number(a) - Number(b)))
  })

  it('keeps the existing restaurant glosses in measured order', () => {
    const restaurant = CURRICULUM_UNITS.find(unit => unit.id === 'u-scenario-restaurant')!
    const glosses = ['KANAWA', 'BONAWA', '500', 'MILADII GANNAWA', 'BILPATHA']
    const refs = glosses.map(gloss => recordings.find(r => r.gloss === gloss && r.file?.startsWith('kaggle_'))!)
    expect(restaurant.signs).toEqual(refs.sort(compare).map(r => r.gloss))
  })

  it('keeps the U1 licence, meaning, hand, motion and duration rules', () => {
    const starter = getStarterUnit()
    expect(starter.id).toBe('u1-starter')
    expect(starter.signs.length).toBeGreaterThanOrEqual(5)
    expect(starter.signs.length).toBeLessThanOrEqual(8)
    const refs = starter.signs.map(gloss => {
      const ref = recordings.find(r => r.gloss === gloss && r.file?.startsWith('kaggle_'))!
      expect(ref, gloss).toBeDefined()
      expect(ref.hands, gloss).toBe(1)
      expect(ref.motion, gloss).toBe('still')
      expect(Boolean(translationOf(gloss)) || /^[A-Z]$|^\d+$/.test(gloss) || months.has(gloss), gloss).toBe(true)
      return ref
    })
    for (let i = 1; i < refs.length; i++) {
      expect(refs[i].durationMs || 0).toBeGreaterThanOrEqual(refs[i - 1].durationMs || 0)
    }
  })

  it('matches the generator without rewriting its output', () => {
    const outputPath = fileURLToPath(new URL('./curriculum.ts', import.meta.url))
    const before = readFileSync(outputPath, 'utf8')
    const report = execFileSync(process.execPath, [
      fileURLToPath(new URL('../../scripts/curriculum-report.mjs', import.meta.url)), '--check',
    ], { encoding: 'utf8', maxBuffer: 1024 * 1024 })
    expect(report).toContain('up to date (no files written)')
    expect(readFileSync(outputPath, 'utf8')).toBe(before)
  })

  it('looks up units by unique ID', () => {
    expect(getUnit('u1-starter')).toEqual(CURRICULUM_UNITS[0])
    for (const unit of CURRICULUM_UNITS) expect(getUnit(unit.id)).toEqual(unit)
    expect(getUnit('nonexistent')).toBeUndefined()
  })
})
