import type { SignRecording } from '../vision/types'
import { RECORDINGS_STORE, withStore } from './db'

// Recordings live in IndexedDB (localStorage would cap out after ~20
// recordings — a 5 s recording is roughly 200 KB of JSON).

export async function listRecordings(): Promise<SignRecording[]> {
  const all = await withStore(
    RECORDINGS_STORE,
    'readonly',
    (s) => s.getAll() as IDBRequest<SignRecording[]>,
  )
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function saveRecording(rec: SignRecording): Promise<IDBValidKey> {
  return withStore(RECORDINGS_STORE, 'readwrite', (s) => s.put(rec))
}

export function deleteRecording(id: string): Promise<undefined> {
  return withStore(RECORDINGS_STORE, 'readwrite', (s) => s.delete(id))
}
