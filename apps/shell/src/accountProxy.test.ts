import { afterEach, expect, it, vi } from 'vitest'
import { proxyAccountPage } from './accountProxy'

afterEach(() => vi.unstubAllGlobals())

it.each(['login', 'register'] as const)('proxies only %s HTML, with query, cookies and an explicit origin', async page => {
  const fetch = vi.fn().mockResolvedValue(new Response('account HTML', { headers: {
    'content-encoding': 'gzip', 'content-length': '500', 'set-cookie': 'fixture=value; Path=/',
    'content-type': 'text/html', 'cache-control': 'public, max-age=60',
  } }))
  vi.stubGlobal('fetch', fetch)
  const response = await proxyAccountPage(new Request(`https://suvana.help/${page}?callbackUrl=%2Flearn%2F`, {
    headers: { cookie: 'session=fixture', 'x-suvana-account-origin': 'https://untrusted.invalid' },
  }), page)
  const [url, options] = fetch.mock.calls[0]
  expect(String(url)).toBe(`https://suvana-communicate.vercel.app/communicate/${page}?callbackUrl=%2Flearn%2F`)
  expect(options.headers.get('cookie')).toBe('session=fixture')
  expect(options.headers.get('x-suvana-account-origin')).toBe('https://suvana.help')
  expect(options.redirect).toBe('manual')
  expect(await response.text()).toBe('account HTML')
  expect(response.headers.get('set-cookie')).toContain('fixture=value')
  expect(response.headers.has('content-encoding')).toBe(false)
  expect(response.headers.has('content-length')).toBe(false)
  expect(response.headers.get('cache-control')).toBe('private, no-store')
})

it('does not proxy password submissions or arbitrary paths', async () => {
  const fetch = vi.fn()
  vi.stubGlobal('fetch', fetch)
  const response = await proxyAccountPage(new Request('https://suvana.help/login', { method: 'POST' }), 'login')
  expect(response.status).toBe(405)
  expect(fetch).not.toHaveBeenCalled()
})

it('returns upstream redirects without following them', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, {
    status: 307, headers: { location: 'https://suvana.help/learn/' },
  })))
  const response = await proxyAccountPage(new Request('https://suvana.help/login'), 'login')
  expect(response.status).toBe(307)
  expect(response.headers.get('location')).toBe('https://suvana.help/learn/')
})
