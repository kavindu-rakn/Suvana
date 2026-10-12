import { afterEach, describe, expect, it, vi } from 'vitest'
import { readLocal, safeLoad } from './safeLoad'

afterEach(() => vi.unstubAllGlobals())

describe('safeLoad', () => {
  it('keeps bundled references and healthy stores when IndexedDB rejects', async () => {
    const result = await safeLoad(
      () => Promise.reject(new Error('SecurityError')),
      async () => [{ id: 'bundled' }],
      async () => [42],
    )
    expect(result).toEqual({ data: [[], [{ id: 'bundled' }], [42]], storageOk: false })
  })

  it('contains synchronous throws and multiple rejected stores', async () => {
    expect(await safeLoad(
      () => { throw new Error('indexedDB blocked') },
      () => Promise.reject(new Error('quota exceeded')),
    )).toEqual({ data: [[], []], storageOk: false })
  })

  it('preserves successful empty stores and mixed result types in input order', async () => {
    const result = await safeLoad(async () => [] as string[], async () => [1, 2])
    const numbers: number[] = result.data[1]
    expect(numbers).toEqual([1, 2])
    expect(result).toEqual({ data: [[], [1, 2]], storageOk: true })
    expect(await safeLoad()).toEqual({ data: [], storageOk: true })
  })
})

describe('readLocal', () => {
  it('returns an empty default when localStorage is unavailable or throws', () => {
    vi.stubGlobal('localStorage', undefined)
    expect(readLocal('signer')).toEqual({ value: '', storageOk: false })
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked') } })
    expect(readLocal('signer')).toEqual({ value: '', storageOk: false })
  })

  it('preserves stored values and distinguishes an absent key from failure', () => {
    vi.stubGlobal('localStorage', { getItem: (key: string) => key === 'signer' ? 'test' : null })
    expect(readLocal('signer')).toEqual({ value: 'test', storageOk: true })
    expect(readLocal('missing')).toEqual({ value: '', storageOk: true })
  })
})
