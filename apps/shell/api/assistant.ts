/**
 * POST /api/assistant — the assistant's model access, with the key server-side.
 *
 * Deployed as a Vercel Edge function on the shell's own project, so the page
 * calls it same-origin and no key ever reaches the browser. Set
 * `GEMINI_API_KEY` in the Vercel project's environment variables; with it
 * unset the endpoint answers 503 and the widget falls back to its local
 * engine, which is a supported way to run this deployment.
 *
 * The logic lives in src/assistant/handler.ts so `npm run dev` can serve the
 * identical code through a Vite middleware — see vite.config.ts.
 */

import { handleAssistant } from '../src/assistant/handler'

export const config = { runtime: 'edge' }

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ error: 'POST only' }, 405)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ error: 'invalid JSON body' }, 400)
  }

  // Vercel puts the real client IP here; the fallback only groups anonymous
  // callers together, which is the safe direction for a rate limit.
  const client =
    request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'

  const result = await handleAssistant(
    (body ?? {}) as Record<string, unknown>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).process?.env?.GEMINI_API_KEY,
    client,
  )
  return json(result.body, result.status)
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      // Same-origin only: this endpoint spends Suvana's quota, so there is no
      // reason for another site to be able to call it from a browser.
      'cache-control': 'no-store',
    },
  })
}
