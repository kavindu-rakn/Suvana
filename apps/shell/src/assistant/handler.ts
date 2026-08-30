/**
 * The server side of the assistant, as one plain function.
 *
 * Kept separate from `api/assistant.ts` so the Vite dev server can run exactly
 * the same code on localhost — a Vercel function does not exist during
 * `npm run dev`, and an assistant that only works once deployed is an
 * assistant nobody tests.
 *
 * Why this exists at all: a key shipped to the browser is a published key.
 * Minifying or encoding it changes nothing — anything the page can read, a
 * visitor can read. So the only way a visitor gets a conversational assistant
 * without bringing their own key is for Suvana's key to stay on a server, and
 * this is that server.
 */

import { MAX_CONTEXT_CHARS, MAX_HISTORY_TURNS, MAX_MESSAGE_CHARS, askGemini } from './model'
import type { Turn } from './model'

export interface AssistantRequest {
  message?: unknown
  history?: unknown
  context?: unknown
}

export interface AssistantResult {
  status: number
  body: Record<string, unknown>
}

/**
 * Requests per window, per client. The endpoint is public — anyone who finds
 * it can spend the project's quota — so this is the difference between a
 * burned daily allowance and a burned one in a few seconds.
 *
 * Honest limitation: serverless instances are ephemeral and there are many of
 * them, so this counter is per-instance and does not add up to a global cap.
 * It stops casual hammering, not a determined abuser. The real backstops are
 * Google's own per-project rate limit and leaving billing disabled, so the
 * worst case is a quota that resets tomorrow rather than an invoice.
 */
const RATE_LIMIT = 20
const RATE_WINDOW_MS = 60_000
const hits = new Map<string, number[]>()

function rateLimited(client: string): boolean {
  const now = Date.now()
  const recent = (hits.get(client) ?? []).filter((t) => now - t < RATE_WINDOW_MS)
  recent.push(now)
  hits.set(client, recent)
  // Unbounded growth is a memory leak on a long-lived instance.
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (!v.some((t) => now - t < RATE_WINDOW_MS)) hits.delete(k)
    }
  }
  return recent.length > RATE_LIMIT
}

function cleanHistory(raw: unknown): Turn[] {
  if (!Array.isArray(raw)) return []
  return raw
    .slice(-MAX_HISTORY_TURNS)
    .filter((t): t is Turn => !!t && typeof t === 'object' && typeof (t as Turn).content === 'string')
    .map((t) => ({
      role: t.role === 'assistant' ? 'assistant' : 'user',
      content: String(t.content).slice(0, MAX_MESSAGE_CHARS),
    }))
}

export async function handleAssistant(
  body: AssistantRequest,
  apiKey: string | undefined,
  client: string,
): Promise<AssistantResult> {
  // 503, not 500: the deployment simply has no key configured, and the widget
  // reads this as "fall back to the local engine" rather than "something
  // broke". A deployment without a key is a supported configuration.
  if (!apiKey) {
    return { status: 503, body: { error: 'not-configured' } }
  }

  const message = typeof body.message === 'string' ? body.message.trim() : ''
  if (!message) return { status: 400, body: { error: 'message is required' } }
  if (message.length > MAX_MESSAGE_CHARS) {
    return { status: 400, body: { error: 'message too long' } }
  }

  if (rateLimited(client)) {
    return { status: 429, body: { error: 'Too many requests — try again in a minute.' } }
  }

  const context = typeof body.context === 'string' ? body.context.slice(0, MAX_CONTEXT_CHARS) : ''

  try {
    const { text, model } = await askGemini({
      key: apiKey,
      message,
      history: cleanHistory(body.history),
      context,
    })
    return { status: 200, body: { text, model } }
  } catch (err) {
    // Never echo the key, and never leak it through an error string.
    const raw = err instanceof Error ? err.message : 'The model call failed.'
    return { status: 502, body: { error: raw.replaceAll(apiKey, '[redacted]') } }
  }
}
