import { expect, it, vi } from 'vitest'
import { signOut } from './signOut'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

it('posts the csrf token to the prefixed Auth.js signout route', async () => {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(json({ csrfToken: 'tok' }))
    .mockResolvedValueOnce(json({ url: 'https://suvana.help/' }))
  await signOut(fetchMock as unknown as typeof fetch)

  expect(fetchMock.mock.calls[0][0]).toBe('/communicate/api/auth/csrf')
  const [url, init] = fetchMock.mock.calls[1]
  expect(url).toBe('/communicate/api/auth/signout')
  expect(init.method).toBe('POST')
  expect(init.headers['x-auth-return-redirect']).toBe('1')
  expect(String(init.body)).toBe('csrfToken=tok&callbackUrl=%2F')
})

it.each([
  ['the csrf request fails', [json({}, 500)]],
  ['there is no csrf token', [json({})]],
  ['the signout post fails', [json({ csrfToken: 'tok' }), json({}, 400)]],
])('rejects when %s, so the header can offer a retry', async (_name, responses) => {
  const fetchMock = vi.fn()
  for (const r of responses) fetchMock.mockResolvedValueOnce(r)
  await expect(signOut(fetchMock as unknown as typeof fetch)).rejects.toThrow('Sign out failed')
})
