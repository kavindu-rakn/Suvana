import { describe, expect, it } from 'vitest'
import { hasMeaningCoverage, isMeaningVerified, orderSignsVerifiedFirst } from './meaningCoverage'

describe('meaning coverage display', () => {
  it('accepts existing English names without claiming a verified translation', () => {
    for (const gloss of ['HELLO', 'RED', 'MONDAY']) {
      expect(hasMeaningCoverage(gloss)).toBe(true)
      expect(isMeaningVerified(gloss)).toBe(false)
    }
  })

  it('keeps untranslated labels visible as unverified, including category outliers', () => {
    for (const gloss of ['AYUBOWAN', 'MRACH', 'MILIYANAYA', 'UNREVIEWED LABEL']) {
      expect(hasMeaningCoverage(gloss)).toBe(false)
    }
    expect(hasMeaningCoverage('KANAWA')).toBe(true)
    expect(hasMeaningCoverage('A')).toBe(true)
    expect(hasMeaningCoverage('50')).toBe(true)
    expect(hasMeaningCoverage('MARCH')).toBe(true)
  })

  it('moves covered names first without mutating the input or corpus order', () => {
    const signs = ['AYUBOWAN', 'WELCOME', 'HELLO'].map(gloss => ({ gloss }))
    expect(orderSignsVerifiedFirst('Greetings', signs).map(s => s.gloss))
      .toEqual(['WELCOME', 'HELLO', 'AYUBOWAN'])
    expect(signs[0].gloss).toBe('AYUBOWAN')
  })

  it('preserves calendar order and leaves unverified month labels last', () => {
    const signs = ['MRACH', 'DECEMBER', 'JANUARY', 'MARCH'].map(gloss => ({ gloss }))
    expect(orderSignsVerifiedFirst('Months', signs).map(s => s.gloss))
      .toEqual(['JANUARY', 'MARCH', 'DECEMBER', 'MRACH'])
  })
})
