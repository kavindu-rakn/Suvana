// Single owner of the IndexedDB connection and schema. Bump DB_VERSION when
// adding a store; onupgradeneeded creates whatever is missing, so both fresh
// installs and upgrades from any older version end up with the same schema.
const DB_NAME = 'ssl-learn'
const DB_VERSION = 3

export const RECORDINGS_STORE = 'recordings' // reference recordings (keyPath: id)
export const ATTEMPTS_STORE = 'attempts' // scored practice attempts (keyPath: id)
export const LATENCY_STORE = 'latency' // feedback-latency samples (keyPath: id)

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      for (const store of [RECORDINGS_STORE, ATTEMPTS_STORE, LATENCY_STORE]) {
        if (!req.result.objectStoreNames.contains(store)) {
          req.result.createObjectStore(store, { keyPath: 'id' })
        }
      }
    }
    // Another tab holding the old version open would otherwise stall the upgrade
    // forever with no error — surface it instead of hanging.
    req.onblocked = () =>
      reject(
        new Error(
          'Database upgrade is blocked. Close other tabs running Suvana, then reload.',
        ),
      )
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb()
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(storeName, mode)
    const req = run(tx.objectStore(storeName))
    let result: T
    req.onsuccess = () => {
      result = req.result
    }
    // Resolve only once the transaction commits, so writes are durable.
    tx.oncomplete = () => {
      db.close()
      resolve(result)
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
    tx.onabort = () => {
      db.close()
      reject(tx.error ?? new Error('IndexedDB transaction aborted'))
    }
  })
}
