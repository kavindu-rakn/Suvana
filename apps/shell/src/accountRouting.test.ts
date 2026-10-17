import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'

const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'))

it('redirects only the legacy Shell host and preserves the wildcard path', () => {
  const rule = config.redirects[0]
  expect(rule).toEqual({ source: '/:path*',
    has: [{ type: 'host', value: 'suvana-shell.vercel.app' }],
    destination: 'https://suvana.help/:path*', permanent: true })
})

// The wildcard above does not match "/" or paths ending in "/" on Vercel
// (seen on production 18 Oct: /, /learn/, /alerts/ still served on the legacy host).
it.each([
  ['/', 'https://suvana.help/'],
  ['/:path*/', 'https://suvana.help/:path*/'],
])('also redirects legacy-host %s to the same place on suvana.help', (source, destination) => {
  expect(config.redirects).toContainEqual({ source,
    has: [{ type: 'host', value: 'suvana-shell.vercel.app' }], destination, permanent: true })
})

it.each(['login', 'register'])('routes root %s through the marked HTML proxy before wildcards', page => {
  const index = config.rewrites.findIndex((r: {source: string}) => r.source === `/${page}`)
  const wildcard = config.rewrites.findIndex((r: {source: string}) => r.source === '/communicate/:path*')
  expect(index).toBeGreaterThanOrEqual(0)
  expect(index).toBeLessThan(wildcard)
  expect(config.rewrites[index].destination).toBe(`/api/${page}`)
  expect(config.redirects).toContainEqual({ source: `/communicate/${page}`, destination: `/${page}`, permanent: true })
})

it('keeps module entry and wildcard rewrites unchanged', () => {
  for (const [source, destination] of [
    ['/learn/', 'https://suvana-learn.vercel.app/learn/'],
    ['/learn/:path*', 'https://suvana-learn.vercel.app/learn/:path*'],
    ['/communicate/', 'https://suvana-communicate.vercel.app/communicate'],
    ['/communicate/:path*', 'https://suvana-communicate.vercel.app/communicate/:path*'],
  ]) expect(config.rewrites).toContainEqual({ source, destination })
})
