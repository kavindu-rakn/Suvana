import { afterEach, expect, it, vi } from 'vitest'
import { recognizeTarget } from './recognizeLink'
import { readFileSync } from 'node:fs'
afterEach(() => vi.unstubAllGlobals())

it('prefers the platform route even when a fallback origin is configured', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"numClasses":171}')))
  expect(await recognizeTarget('https://fallback.example.invalid', false)).toBe('/recognize/')
})

it('uses an explicit origin only if the platform endpoint fails', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 404 })))
  expect(await recognizeTarget('https://fallback.example.invalid', false)).toBe('https://fallback.example.invalid/')
})

it('does not treat a preview HTML response or an unsafe fallback as a service', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>preview</html>')))
  expect(await recognizeTarget('javascript:alert(1)', false)).toBe('/recognize/')
})

it('keeps the two known laptop ports as a last local fallback', async () => {
  vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) =>
    url.includes(':7860/') ? Promise.resolve(new Response()) : Promise.reject(new Error('offline'))))
  expect(await recognizeTarget('', true)).toBe('http://localhost:7860/')
})

it('keeps exact, slash and nested HTTP rewrites ahead of other wildcard rules', () => {
  const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'))
  expect(config.rewrites.filter((r: {source: string}) => r.source.startsWith('/recognize'))).toEqual([
    {source:'/recognize',destination:'https://suvana-production.up.railway.app/?suvana_mount=recognize'},
    {source:'/recognize/',destination:'https://suvana-production.up.railway.app/?suvana_mount=recognize'},
    {source:'/recognize/:path*',destination:'https://suvana-production.up.railway.app/:path*?suvana_mount=recognize'},
  ])
  const index = config.rewrites.findIndex((r: {source: string}) => r.source === '/recognize/:path*')
  expect(config.rewrites.slice(0,index).some((r: {source: string})=>r.source.includes(':path*'))).toBe(false)
})
