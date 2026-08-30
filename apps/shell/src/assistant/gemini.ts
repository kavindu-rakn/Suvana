/**
 * Choosing how the assistant reaches a model, from the browser.
 *
 * Two routes, in order:
 *
 * 1. **Suvana's own access** — POST to same-origin `/api/assistant`, which
 *    holds the key server-side (see `handler.ts`). This is what a visitor
 *    gets: a conversational assistant with no key, no account and no idea a
 *    key exists. A key shipped to the browser would be a published key, so
 *    this indirection is the whole point.
 * 2. **A personal key** — entered in the widget, kept in this browser's
 *    `localStorage`, sent only to Google. Useful when the deployment has no
 *    key configured, or for testing a different model.
 *
 * If neither is available the caller falls back to the local engine, which
 * answers every question anyway — just in fixed phrasing.
 */

import { PREFERRED_MODEL, askGemini, listModels, pickModel } from './model'
import type { Turn } from './model'

export { KEYS_URL, PREFERRED_MODEL, pickModel } from './model'
export type { Turn } from './model'

const PROXY_URL = '/api/assistant'

const KEY_STORAGE = 'suvana.assistant.geminiKey'
const MODEL_STORAGE = 'suvana.assistant.geminiModel'
const RESOLVED_STORAGE = 'suvana.assistant.geminiResolved'

/** Thrown when there is no model access at all — not an error worth showing. */
export class NoModelAccess extends Error {
  constructor() {
    super('no model access configured')
    this.name = 'NoModelAccess'
  }
}

/**
 * undefined until the first attempt. Once the endpoint has answered 503
 * ("no key configured") or failed to exist at all, stop paying a round trip
 * per message for the rest of the session.
 */
let proxyAvailable: boolean | undefined

function read(k: string): string {
  try {
    return localStorage.getItem(k) ?? ''
  } catch {
    return ''
  }
}

function write(k: string, v: string): void {
  try {
    if (v) localStorage.setItem(k, v)
    else localStorage.removeItem(k)
  } catch {
    /* private browsing — the assistant still works locally */
  }
}

export const readKey = () => read(KEY_STORAGE)
export const writeKey = (key: string) => {
  write(KEY_STORAGE, key)
  // A new key may reach a different set of models, so re-resolve for it.
  write(RESOLVED_STORAGE, '')
}

/** The model the user asked for, if they overrode the preference. */
export const readModelPreference = () => read(MODEL_STORAGE) || PREFERRED_MODEL
export const writeModelPreference = (model: string) => {
  write(MODEL_STORAGE, model.trim())
  write(RESOLVED_STORAGE, '')
}

async function askProxy(
  message: string,
  history: Turn[],
  context: string,
  signal?: AbortSignal,
): Promise<{ text: string; model: string } | null> {
  let res: Response
  try {
    res = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal,
      body: JSON.stringify({ message, history, context }),
    })
  } catch {
    // No endpoint here at all — a static host with no functions, or offline.
    proxyAvailable = false
    return null
  }

  if (res.ok) {
    proxyAvailable = true
    const data = await res.json()
    if (typeof data?.text === 'string' && data.text) return { text: data.text, model: data.model ?? '' }
    proxyAvailable = false
    return null
  }

  // 503 is the deployment saying it has no key. 404/405 mean the function is
  // not deployed. Both are configurations, not failures: fall through quietly.
  if (res.status === 503 || res.status === 404 || res.status === 405) {
    proxyAvailable = false
    return null
  }

  // A real failure from a working proxy — rate limit, upstream error. Say so
  // rather than silently pretending there is no assistant.
  let detail = `The assistant service returned HTTP ${res.status}.`
  try {
    const body = await res.json()
    if (typeof body?.error === 'string') detail = body.error
  } catch {
    /* non-JSON */
  }
  throw new Error(detail)
}

/**
 * One answer from whichever route is available.
 *
 * Throws `NoModelAccess` when there is none, which the caller treats as "use
 * the local answer, say nothing" rather than as an error.
 */
export async function askAssistant(
  message: string,
  history: Turn[],
  context: string,
  signal?: AbortSignal,
): Promise<{ text: string; model: string; via: 'suvana' | 'gemini' }> {
  if (proxyAvailable !== false) {
    const viaProxy = await askProxy(message, history, context, signal)
    if (viaProxy) return { ...viaProxy, via: 'suvana' }
  }

  const key = readKey()
  if (!key) throw new NoModelAccess()

  const { text, model } = await askGemini({
    key,
    message,
    history,
    context,
    preferred: readModelPreference(),
    cached: read(RESOLVED_STORAGE) || undefined,
    signal,
    onResolved: (m) => write(RESOLVED_STORAGE, m),
  })
  return { text, model, via: 'gemini' }
}

/** Whether this deployment can answer without the visitor bringing a key. */
export async function probeProxy(): Promise<boolean> {
  if (proxyAvailable !== undefined) return proxyAvailable
  try {
    // An empty message is rejected with 400 by a configured endpoint and 503
    // by an unconfigured one, so this distinguishes them without spending a
    // model call.
    const res = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: '' }),
    })
    proxyAvailable = res.status !== 503 && res.status !== 404 && res.status !== 405
  } catch {
    proxyAvailable = false
  }
  return proxyAvailable
}

/** Validate a pasted key without spending a real turn on it. */
export async function verifyKey(key: string): Promise<{ ok: boolean; message: string }> {
  try {
    const available = await listModels(key)
    if (!available.length) return { ok: false, message: 'That key reaches no usable Gemini models.' }
    const preferred = readModelPreference()
    const chosen = pickModel(preferred, available)
    if (!chosen) return { ok: false, message: 'That key reaches no usable Gemini models.' }
    write(RESOLVED_STORAGE, chosen)
    return {
      ok: true,
      message:
        chosen === preferred
          ? `Key accepted — your key will answer, using ${chosen}.`
          : `Key accepted. ${preferred} is not available to this key, so ${chosen} will be used.`,
    }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Could not reach Google.' }
  }
}
