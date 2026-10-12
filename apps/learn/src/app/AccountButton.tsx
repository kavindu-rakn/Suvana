import { ACCOUNT_URL, SIGN_IN_URL } from './session'
import type { SuvanaUser } from './session'

/**
 * The Suvana account, as a round button in AppNavBar's `account` slot.
 *
 * Round and fixed-width on purpose: it sits beside the author and theme
 * buttons, and a text link of variable width pushed the centred tabs about
 * and overflowed the bar on phones. The full name lives in the tooltip.
 *
 * Shared with R26; inactive unless the build config enables Suvana.
 */
export function AccountButton({ user }: { user: SuvanaUser | null | undefined }) {
  if (import.meta.env.VITE_SUVANA !== '1') return null
  // Unknown yet: hold the space without showing anything, so neither a
  // "Sign in" flash nor the tabs jumping sideways greets someone signed in.
  if (user === undefined) return <span className="app-account is-pending" aria-hidden="true" />


  if (!user) {
    return (
      <a className="app-account" href={SIGN_IN_URL} title="Sign in to Suvana" aria-label="Sign in">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
        </svg>
      </a>
    )
  }

  const label = user.name ?? user.email ?? 'Your account'
  const admin = user.role === 'admin'
  const initial = Array.from(label.trim())[0]?.toUpperCase() ?? '?'

  return (
    <a
      className="app-account is-signed-in"
      href={ACCOUNT_URL}
      title={`${label}${user.email && user.name ? ` (${user.email})` : ''}${admin ? ' · admin' : ''}`}
      aria-label={`Account: ${label}${admin ? ', admin' : ''}`}
    >
      {initial}
      {admin && <span className="app-account-admin" aria-hidden="true" />}
    </a>
  )
}
