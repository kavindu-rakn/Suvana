/**
 * Ends the Communicate (Auth.js) session straight from the Shell header.
 *
 * Linking to /communicate/api/auth/signout does not work on suvana.help: Auth.js
 * answers a GET with its own "Are you sure?" page, and that page's form posts to
 * /api/auth/signout (no /communicate prefix, because Auth.js does not know about
 * Next's basePath), which is a 404. So the Shell does what next-auth/react's
 * signOut() does itself: fetch a CSRF token, then POST it. Same origin, so the
 * session cookie is cleared by the response.
 */
const AUTH_BASE = '/communicate/api/auth';

export async function signOut(fetchImpl: typeof fetch = fetch): Promise<void> {
  const csrf = await fetchImpl(`${AUTH_BASE}/csrf`, {
    headers: { accept: 'application/json' },
    credentials: 'same-origin',
  });
  if (!csrf.ok) throw new Error(`Sign out failed: csrf ${csrf.status}`);
  const { csrfToken } = (await csrf.json()) as { csrfToken?: string };
  if (!csrfToken) throw new Error('Sign out failed: no csrf token');

  const res = await fetchImpl(`${AUTH_BASE}/signout`, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      // Ask for JSON instead of a redirect; the caller decides where to go.
      'x-auth-return-redirect': '1',
    },
    credentials: 'same-origin',
    body: new URLSearchParams({ csrfToken, callbackUrl: '/' }),
  });
  if (!res.ok) throw new Error(`Sign out failed: ${res.status}`);
}
