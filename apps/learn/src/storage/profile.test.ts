import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProgressProfile } from './profile'

/** Small fake IndexedDB for the request/transaction API this storage layer uses.
 * Exercises the real db.ts and attemptLog.ts, rather than mocking withStore.
 * Native Chromium integration is also run separately in the handoff.
 */
class FakeIndexedDB {
  databases = new Map<string, Map<string, Map<IDBValidKey, unknown>>>()
  opened: string[] = []
  failOpen = false
  failTransaction = false

  seed(name: string, store: string, value: { id: string }) {
    if (!this.databases.has(name)) this.databases.set(name, new Map(['recordings', 'attempts', 'latency'].map((s) => [s, new Map()])))
    this.databases.get(name)!.get(store)!.set(value.id, value)
  }

  open(name: string) {
    this.opened.push(name)
    const req = { result: undefined, error: new Error('Storage denied') } as unknown as IDBOpenDBRequest
    queueMicrotask(() => {
      if (this.failOpen) { req.onerror?.(new Event('error')); return }
      const upgrade = !this.databases.has(name)
      if (upgrade) this.databases.set(name, new Map())
      const tables = this.databases.get(name)!
      const db = {
        objectStoreNames: { contains: (s: string) => tables.has(s) },
        createObjectStore: (s: string) => tables.set(s, new Map()),
        close: () => {},
        transaction: (storeName: string) => {
          const tx = {} as IDBTransaction
          const request = (run: () => unknown) => {
            const child = {} as IDBRequest
            queueMicrotask(() => {
              if (this.failTransaction) { tx.onabort?.(new Event('abort')); return }
              Object.assign(child, { result: run() })
              child.onsuccess?.(new Event('success'))
              queueMicrotask(() => tx.oncomplete?.(new Event('complete')))
            })
            return child
          }
          const table = tables.get(storeName)!
          tx.objectStore = (() => ({
            getAll: () => request(() => [...table.values()]),
            put: (value: { id: string }) => request(() => { table.set(value.id, structuredClone(value)); return value.id }),
            clear: () => request(() => table.clear()),
          })) as unknown as IDBTransaction['objectStore']
          return tx
        },
      }
      Object.assign(req, { result: db })
      if (upgrade) req.onupgradeneeded?.(new Event('upgradeneeded') as IDBVersionChangeEvent)
      req.onsuccess?.(new Event('success'))
    })
    return req
  }
}

let fake: FakeIndexedDB
let stored: Map<string, string>
const entry = (score: number) => ({ id: 'same-id', gloss: 'FIXTURE', referenceId: 'fixture-reference', score,
  worstFingers: [], createdAt: '2026-10-13T00:00:00Z' })

beforeEach(() => {
  vi.resetModules()
  fake = new FakeIndexedDB()
  stored = new Map()
  vi.stubGlobal('indexedDB', fake)
  vi.stubGlobal('localStorage', { getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => stored.set(key, value) })
})
afterEach(() => vi.unstubAllGlobals())

describe('browser progress profiles', () => {
  it('keeps the original default database and existing attempts', async () => {
    fake.seed('ssl-learn', 'attempts', entry(90))
    const profile = await import('./profile')
    const { listAttempts } = await import('../learner/attemptLog')
    expect(profile.getActiveProfile()).toBe('default')
    expect(profile.profileDatabaseName('default')).toBe('ssl-learn')
    expect((await listAttempts()).map((attempt) => attempt.score)).toEqual([90])
  })
  it('isolates identical attempt IDs and derived mastery between default and demo', async () => {
    const profile = await import('./profile')
    const { addAttempt, listAttempts } = await import('../learner/attemptLog')
    const { summarizeGloss } = await import('../learner/mastery')
    await addAttempt(entry(90))
    expect(profile.setActiveProfile('demo')).toBe(true)
    expect(await listAttempts()).toEqual([])
    await addAttempt(entry(30))
    expect(summarizeGloss('FIXTURE', await listAttempts()).mastery).toBe(0.3)
    profile.setActiveProfile('default')
    expect(summarizeGloss('FIXTURE', await listAttempts()).mastery).toBe(0.9)
    expect(fake.opened).toContain('ssl-learn-demo')
  })
  it('resets only the requested profile and preserves recordings, latency and current selection', async () => {
    const profile = await import('./profile')
    const { addAttempt, listAttempts } = await import('../learner/attemptLog')
    const { summarizeGloss } = await import('../learner/mastery')
    await addAttempt(entry(90))
    profile.setActiveProfile('demo')
    await addAttempt(entry(30))
    fake.seed('ssl-learn-demo', 'recordings', { id: 'reference' })
    fake.seed('ssl-learn-demo', 'latency', { id: 'sample' })
    profile.setActiveProfile('default')
    await profile.resetProgress('demo')
    expect(profile.getActiveProfile()).toBe('default')
    expect((await listAttempts())[0].score).toBe(90)
    profile.setActiveProfile('demo')
    expect(summarizeGloss('FIXTURE', await listAttempts()).level).toBe('new')
    expect(fake.databases.get('ssl-learn-demo')!.get('recordings')!.size).toBe(1)
    expect(fake.databases.get('ssl-learn-demo')!.get('latency')!.size).toBe(1)
    await profile.resetProgress('demo') // Idempotent.
    profile.setActiveProfile('default')
    await profile.resetProgress() // Omitted profile captures active selection.
    expect(await listAttempts()).toEqual([])
  })
  it('persists selection across module reloads and defaults safely for unknown values', async () => {
    let profile = await import('./profile')
    profile.setActiveProfile('demo')
    expect(stored.get(profile.PROFILE_STORAGE_KEY)).toBe('demo')
    vi.resetModules()
    profile = await import('./profile')
    expect(profile.getActiveProfile()).toBe('demo')
    stored.set(profile.PROFILE_STORAGE_KEY, 'unknown')
    vi.resetModules()
    expect((await import('./profile')).getActiveProfile()).toBe('default')
  })
  it('keeps a safe in-memory selection when localStorage reads/writes throw', async () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked') },
      setItem: () => { throw new Error('blocked') } })
    const profile = await import('./profile')
    expect(profile.getActiveProfile()).toBe('default')
    expect(profile.setActiveProfile('demo')).toBe(false)
    expect(profile.getActiveProfile()).toBe('demo')
  })
  it('captures the database at operation start while another profile is selected', async () => {
    const profile = await import('./profile')
    const { addAttempt, listAttempts } = await import('../learner/attemptLog')
    const pending = addAttempt(entry(90))
    profile.setActiveProfile('demo')
    await pending
    expect(await listAttempts()).toEqual([])
    profile.setActiveProfile('default')
    expect((await listAttempts())[0].score).toBe(90)
  })
  it('propagates denied storage and transaction abort without clearing another profile', async () => {
    const profile = await import('./profile')
    fake.seed('ssl-learn', 'attempts', entry(90))
    fake.failOpen = true
    await expect(profile.resetProgress('default')).rejects.toThrow('Storage denied')
    fake.failOpen = false
    fake.failTransaction = true
    await expect(profile.resetProgress('default')).rejects.toThrow('transaction aborted')
    expect(fake.databases.get('ssl-learn')!.get('attempts')!.size).toBe(1)
  })
  it('rejects invalid profile names before changing selection or touching a database', async () => {
    const profile = await import('./profile')
    expect(() => profile.setActiveProfile('bad' as ProgressProfile)).toThrow('Unknown progress profile')
    expect(() => profile.profileDatabaseName('bad' as ProgressProfile)).toThrow()
    await expect(profile.resetProgress('bad' as ProgressProfile)).rejects.toThrow()
    expect(profile.getActiveProfile()).toBe('default')
    expect(fake.opened).toEqual([])
  })
})
