import { afterEach, describe, expect, it, vi } from 'vitest'
import { markOnboardingSeen, onboardingSeen } from './onboardingFlag'

function memoryStorage() {
  const data = new Map<string, string>()
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('onboarding first-run flag', () => {
  it('is unseen until marked, then seen', () => {
    vi.stubGlobal('window', { localStorage: memoryStorage() })
    expect(onboardingSeen()).toBe(false)
    markOnboardingSeen()
    expect(onboardingSeen()).toBe(true)
  })

  it('treats blocked storage as unseen and never throws', () => {
    const blocked = {
      getItem: () => {
        throw new DOMException('blocked', 'SecurityError')
      },
      setItem: () => {
        throw new DOMException('blocked', 'SecurityError')
      },
    }
    vi.stubGlobal('window', { localStorage: blocked })
    expect(onboardingSeen()).toBe(false)
    expect(() => markOnboardingSeen()).not.toThrow()
  })

  it('treats a localStorage getter that throws as unseen', () => {
    vi.stubGlobal('window', {
      get localStorage(): Storage {
        throw new DOMException('blocked', 'SecurityError')
      },
    })
    expect(onboardingSeen()).toBe(false)
    expect(() => markOnboardingSeen()).not.toThrow()
  })
})
