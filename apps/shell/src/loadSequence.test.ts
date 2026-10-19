import { describe, expect, it } from 'vitest'
import { activityCounter, registrationNavigation } from './loadSequence'

describe('navigation loading', () => {
  const click = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, defaultPrevented: false }
  const link = { href: '/register?callbackUrl=%2F', target: '', download: false }
  it('only covers ordinary same-origin sign-up navigation', () => {
    expect(registrationNavigation(click, link, 'https://suvana.help/')).toBe(true)
    for (const href of ['/learn/', '/#overview', 'https://example.com/register']) {
      expect(registrationNavigation(click, { ...link, href }, 'https://suvana.help/')).toBe(false)
    }
  })
  it('preserves modified clicks, downloads, new tabs and cancelled events', () => {
    for (const event of [{ ...click, ctrlKey: true }, { ...click, metaKey: true }, { ...click, shiftKey: true }, { ...click, altKey: true }, { ...click, button: 1 }, { ...click, defaultPrevented: true }]) {
      expect(registrationNavigation(event, link, 'https://suvana.help/')).toBe(false)
    }
    for (const extra of [{ target: '_blank' }, { download: true }]) {
      expect(registrationNavigation(click, { ...link, ...extra }, 'https://suvana.help/')).toBe(false)
    }
  })
})

describe('activity counter lifecycle', () => {
  it('waits for actual completion and stops its animation on completion or cancellation', () => {
    let now = 0, id = 0
    const pending = new Map<number, FrameRequestCallback>(), values: number[] = []
    const clock = { now: () => now, request: (callback: FrameRequestCallback) => { pending.set(++id, callback); return id }, cancel: (id: number) => { pending.delete(id) } }
    const counter = activityCounter(value => values.push(value), clock)
    expect(values).toEqual([0])
    now = 60000
    const frame = [...pending.values()][0]
    pending.clear(); frame(now)
    expect(values.at(-1)).toBe(95)
    counter.complete()
    expect(values.at(-1)).toBe(100)
    expect(pending.size).toBe(0)
    const cancelled = activityCounter(value => values.push(value), clock)
    cancelled.cancel()
    expect(pending.size).toBe(0)
    expect(values.at(-1)).toBe(0)
  })
  it('supports reduced motion without a timer or forced waiting period', () => {
    const values: number[] = []
    const counter = activityCounter(value => values.push(value), { now: () => 0, request: () => { throw Error('No animation expected') }, cancel: () => {} }, true)
    counter.complete()
    expect(values).toEqual([0, 100])
  })
})
