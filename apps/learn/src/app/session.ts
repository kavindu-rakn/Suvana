/**
 * The signed-in Suvana account, as seen from the Learn module.
 *
 * Identity lives in the Communicate module — it has the database, Auth.js and
 * the sign-in pages. Because the shell serves /learn/* and /communicate/* from
 * one origin, that module's session cookie is visible here and a single
 * same-origin fetch is the whole integration.
 *
 * Learn deliberately does NOT gate practice behind this. Progress lives in
 * this browser's IndexedDB, so requiring an account would imply that signing
 * in carries your progress between devices, which it does not yet. Until
 * progress is stored server-side, the account is an identity the platform
 * shares, not a key to the module.
 */

export interface SuvanaUser {
  name?: string | null
  email?: string | null
  role?: 'user' | 'admin'
}

/** Where Communicate is mounted on the Suvana domain. */
const COMMUNICATE = '/communicate'

export const SIGN_IN_URL = `${COMMUNICATE}/login?callbackUrl=${encodeURIComponent('/learn/')}`
export const ACCOUNT_URL = `${COMMUNICATE}/dashboard`

/**
 * Resolves to the current user, or null when signed out — and also when the
 * Communicate deployment is unreachable. A learner practising offline, or on
 * a deployment where only Learn is up, must not be shown an error about a
 * module they were not trying to use.
 */
export async function fetchSession(signal?: AbortSignal): Promise<SuvanaUser | null> {
  try {
    const res = await fetch(`${COMMUNICATE}/api/auth/session`, {
      headers: { accept: 'application/json' },
      signal,
    })
    if (!res.ok) return null
    const data: unknown = await res.json()
    const user = (data as { user?: SuvanaUser } | null)?.user
    return user ?? null
  } catch {
    return null
  }
}
