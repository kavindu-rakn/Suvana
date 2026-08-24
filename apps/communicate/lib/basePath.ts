/**
 * Suvana one-domain topology.
 *
 * Behind the platform shell this app is served under a path prefix (Next
 * `basePath` "/communicate", proxied by the shell's rewrite). Next.js
 * prefixes pages, assets, Link/router navigation and API route *handlers*
 * automatically — but raw client-side `fetch("/api/...")` calls and the
 * next-auth browser client build URLs from the origin root, so they must go
 * through `apiPath()` / `BASE_PATH`.
 *
 * When the app runs standalone (no NEXT_PUBLIC_BASE_PATH, as in Lithira's
 * original deployment) both values collapse to the old behaviour.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const apiPath = (path: string) => `${BASE_PATH}${path}`;
