import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchSession } from './session'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('platform session', () => {
  it.each(['', undefined])('never contacts Communicate in standalone mode (%s)', async (flag) => {
    vi.stubEnv('VITE_SUVANA', flag)
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    expect(await fetchSession()).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('uses the same-origin session and forwards cancellation in Suvana', async () => {
    vi.stubEnv('VITE_SUVANA', '1')
    const user = { name: 'Learner', role: 'user' }
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ user }) })
    vi.stubGlobal('fetch', fetch)
    const controller = new AbortController()
    expect(await fetchSession(controller.signal)).toEqual(user)
    expect(fetch).toHaveBeenCalledWith('/communicate/api/auth/session', {
      headers: { accept: 'application/json' }, signal: controller.signal,
    })
  })

  it('keeps Learn usable when the platform is unreachable', async () => {
    vi.stubEnv('VITE_SUVANA', '1')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    expect(await fetchSession()).toBeNull()
  })
})
