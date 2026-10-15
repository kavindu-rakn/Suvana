import { describe, expect, it } from 'vitest'
import { signCardAction } from './signCardAction'

describe('sign card activation', () => {
  it('previews the first touch and opens on the second touch of that sign', () => {
    expect(signCardAction(true, true, null, 'a')).toBe('preview')
    expect(signCardAction(true, true, 'a', 'a')).toBe('select')
    expect(signCardAction(true, true, 'a', 'b')).toBe('preview')
  })
  it('opens directly with a mouse or in the recording picker without preview', () => {
    expect(signCardAction(true, false, null, 'a')).toBe('select')
    expect(signCardAction(false, true, null, 'a')).toBe('select')
  })
})
