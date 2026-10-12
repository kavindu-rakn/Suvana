type Loader = () => Promise<unknown[]>
type Loaded<T extends readonly Loader[]> = { [K in keyof T]: Awaited<ReturnType<T[K]>> }

/** Keep successful stores (especially bundled references) when another fails.
 * Factories also catch synchronous failures, such as a blocked indexedDB getter.
 */
export async function safeLoad<T extends readonly Loader[]>(...loaders: T): Promise<{
  data: Loaded<T>
  storageOk: boolean
}> {
  const results = await Promise.allSettled(loaders.map((load) => Promise.resolve().then(load)))
  return {
    data: results.map((result) => result.status === 'fulfilled' ? result.value : []) as Loaded<T>,
    storageOk: results.every((result) => result.status === 'fulfilled'),
  }
}

/** Accessing localStorage itself can throw in restricted browser contexts. */
export function readLocal(key: string): { value: string; storageOk: boolean } {
  try {
    return { value: localStorage.getItem(key) ?? '', storageOk: true }
  } catch {
    return { value: '', storageOk: false }
  }
}
