import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { RecordingMeta } from '../vision/types'
import { contentCoverage, filterContentIndex } from '../storage/bundledReferences'
import { CURRICULUM_UNITS } from './curriculum'

const packed = JSON.parse(readFileSync('public/reference-index.json', 'utf8')) as {
  sources: Record<string, Partial<RecordingMeta>>
  recordings: RecordingMeta[]
}
const index = packed.recordings.map((rec) => ({
  ...(rec.source ? packed.sources[rec.source] : {}), ...rec,
}))

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('content edition', () => {
  it('retains every reference, including NC content, in the full academic edition', () => {
    expect(filterContentIndex(index, 'all')).toBe(index)
    expect(index.some((rec) => rec.file?.startsWith('yohan_'))).toBe(true)
  })

  it('selects only declared CC0 references; no Yohan id, source or file survives', () => {
    const selected = filterContentIndex(index, 'cc0')
    expect(selected.length).toBeGreaterThan(0)
    expect(selected).toEqual(index.filter((rec) => rec.file?.startsWith('kaggle_')))
    expect(selected.every((rec) => rec.licence === 'CC0-1.0')).toBe(true)
    expect(selected.some((rec) => rec.id.startsWith('yohan_') || rec.file?.startsWith('yohan_'))).toBe(false)
    const sample = selected[0]!
    expect(filterContentIndex([
      { ...sample, licence: undefined },
      { ...sample, licence: 'CC-BY-NC-SA-4.0' },
      { ...sample, file: 'yohan_disguised.json' },
      { ...sample, id: 'yohan_disguised' },
      { ...sample, source: 'yohan-dataset' },
    ], 'cc0')).toEqual([])
  })

  it('identifies incomplete curriculum units without removing their approved signs', () => {
    const selected = filterContentIndex(index, 'cc0')
    const coverage = CURRICULUM_UNITS.map((unit) => contentCoverage(unit.signs, selected))
    expect(coverage.some((unit) => unit.preview)).toBe(true)
    expect(coverage.some((unit) => !unit.preview)).toBe(true)
    for (const [i, unit] of CURRICULUM_UNITS.entries()) {
      expect(contentCoverage(unit.signs, index).preview).toBe(false)
      expect(coverage[i]!.total).toBe(unit.signs.length)
    }
  })

  it('filters after packed provenance is restored and prevents direct NC frame requests', async () => {
    vi.resetModules()
    vi.stubEnv('VITE_CONTENT', 'cc0')
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(packed)))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'cc0-frame', frames: [] })))
    vi.stubGlobal('fetch', fetchMock)
    const { loadReferenceIndex, loadReferenceFrames } = await import('../storage/bundledReferences')
    const selected = await loadReferenceIndex()
    expect(selected).toEqual(filterContentIndex(index, 'cc0'))
    const excluded = index.find((rec) => rec.file?.startsWith('yohan_'))!
    expect(await loadReferenceFrames(excluded.file!)).toBeNull()
    expect(await loadReferenceFrames('not-in-index.json')).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(await loadReferenceFrames(selected[0]!.file!)).toEqual({ id: 'cc0-frame', frames: [] })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('defaults missing or invalid configuration to the full academic edition', async () => {
    for (const value of [undefined, 'unexpected', 'all']) {
      vi.resetModules()
      vi.stubEnv('VITE_CONTENT', value)
      expect((await import('../storage/bundledReferences')).CONTENT_EDITION).toBe('all')
    }
  })
})
