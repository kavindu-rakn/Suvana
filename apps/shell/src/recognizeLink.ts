/** The platform path wins; the old origin setting is only an outage fallback. */
export async function recognizeTarget(fallback: string, local: boolean): Promise<string> {
  try {
    const response = await fetch('/recognize/api/info', {
      headers: { accept: 'application/json' }, signal: AbortSignal.timeout(2500),
    })
    if (response.ok && typeof (await response.json()).numClasses === 'number') return '/recognize/'
  } catch { /* A local preview may not implement the Shell's rewrites. */ }
  try {
    const url = new URL(fallback)
    if (['http:', 'https:'].includes(url.protocol)) return url.href
  } catch { /* Unset setting: retain the documented laptop fallback below. */ }
  if (local) {
    try {
      const port = await Promise.any([8000, 7860].map(port =>
        fetch(`http://localhost:${port}/api/info`, { mode: 'no-cors', signal: AbortSignal.timeout(1500) }).then(() => port)))
      return `http://localhost:${port}/`
    } catch { /* No local service: keep the canonical path rather than guessing. */ }
  }
  return '/recognize/'
}
