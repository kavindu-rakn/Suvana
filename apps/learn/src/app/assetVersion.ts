/** Bump whenever a reference, WASM runtime or model file changes, including
 * a MediaPipe dependency upgrade. Old deployments cached these for a year.
 */
export const ASSET_VERSION = '2026-10-13-1'

/** Preserve the deployment base, existing query parameters and any fragment. */
export function withAssetVersion(url: string): string {
  const hashAt = url.indexOf('#')
  const fragment = hashAt < 0 ? '' : url.slice(hashAt)
  const resource = hashAt < 0 ? url : url.slice(0, hashAt)
  const queryAt = resource.indexOf('?')
  const path = queryAt < 0 ? resource : resource.slice(0, queryAt)
  const query = new URLSearchParams(queryAt < 0 ? '' : resource.slice(queryAt + 1))
  query.set('v', ASSET_VERSION)
  return `${path}?${query}${fragment}`
}
