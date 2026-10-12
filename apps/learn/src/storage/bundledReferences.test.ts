import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { withAssetVersion } from '../app/assetVersion'

beforeEach(() => vi.resetModules())
afterEach(() => vi.unstubAllGlobals())

describe('bundled reference asset requests', () => {
  it('versions index and frame requests while retaining shared requests and frame caching', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('[]'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'fixture', frames: [] })))
    vi.stubGlobal('fetch', fetchMock)
    const { loadReferenceIndex, loadReferenceFrames } = await import('./bundledReferences')
    const firstIndex = loadReferenceIndex()
    expect(loadReferenceIndex()).toBe(firstIndex)
    expect(await firstIndex).toEqual([])
    const firstFrames = loadReferenceFrames('fixture.json')
    expect(loadReferenceFrames('fixture.json')).toBe(firstFrames)
    expect(await firstFrames).toEqual({ id: 'fixture', frames: [] })
    expect(fetchMock.mock.calls).toEqual([
      [withAssetVersion(`${import.meta.env.BASE_URL}reference-index.json`)],
      [withAssetVersion(`${import.meta.env.BASE_URL}references/fixture.json`)],
    ])
  })

  it('retries a failed frame request using the versioned URL', async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'fixture', frames: [] })))
    vi.stubGlobal('fetch', fetchMock)
    const { loadReferenceFrames } = await import('./bundledReferences')
    expect(await loadReferenceFrames('fixture.json')).toBeNull()
    expect(await loadReferenceFrames('fixture.json')).toEqual({ id: 'fixture', frames: [] })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock).toHaveBeenLastCalledWith(withAssetVersion(`${import.meta.env.BASE_URL}references/fixture.json`))
  })
})
