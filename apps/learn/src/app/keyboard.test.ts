import { describe, expect, it } from 'vitest'
import { isActivatableTarget, isTextEntryTarget, shortcutBlockedByTarget } from './keyboard'

const el = (tagName: string, extra: Record<string, unknown> = {}) =>
  ({ tagName, parentElement: null, ...extra }) as unknown as EventTarget

describe('keyboard targets', () => {
  it('treats text fields and contenteditable as text entry', () => {
    for (const tag of ['INPUT', 'TEXTAREA', 'SELECT', 'input']) {
      expect(isTextEntryTarget(el(tag))).toBe(true)
    }
    expect(isTextEntryTarget(el('DIV', { isContentEditable: true }))).toBe(true)
    expect(isTextEntryTarget(el('BUTTON'))).toBe(false)
    expect(isTextEntryTarget(el('BODY'))).toBe(false)
    expect(isTextEntryTarget(null)).toBe(false)
  })

  it('treats buttons and links as activatable, and finds them from a child', () => {
    expect(isActivatableTarget(el('BUTTON'))).toBe(true)
    expect(isActivatableTarget(el('A'))).toBe(true)
    const span = el('SPAN', { parentElement: el('BUTTON') })
    expect(isActivatableTarget(span)).toBe(true)
    expect(isActivatableTarget(el('BODY'))).toBe(false)
  })

  it('lets a focused button keep Enter and Space but not other shortcuts', () => {
    const button = el('BUTTON')
    expect(shortcutBlockedByTarget('Enter', button)).toBe(true)
    expect(shortcutBlockedByTarget(' ', button)).toBe(true)
    expect(shortcutBlockedByTarget('Escape', button)).toBe(false)
    expect(shortcutBlockedByTarget('ArrowLeft', button)).toBe(false)
    expect(shortcutBlockedByTarget('2', button)).toBe(false)
  })

  it('lets a text field keep every key, and the page body none', () => {
    const input = el('INPUT')
    for (const key of ['Enter', ' ', 'Escape', 'm', '1']) {
      expect(shortcutBlockedByTarget(key, input)).toBe(true)
      expect(shortcutBlockedByTarget(key, el('BODY'))).toBe(false)
    }
  })
})
