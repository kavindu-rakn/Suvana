/**
 * The serverless side of the assistant.
 *
 * This is the code path that holds Suvana's API key, so the things worth
 * pinning are the ones that protect it: that a missing key degrades instead of
 * erroring, that the endpoint cannot be used as an open relay, and that the
 * key can never appear in a response body.
 *
 * Each test uses its own client id — the rate limiter is module-level state
 * shared across the file.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

import { handleAssistant } from './handler'
import { MAX_MESSAGE_CHARS } from './model'

const KEY = 'AIzaTEST-not-a-real-key'

/** A Gemini response, or an error, without touching the network. */
function stubGemini(impl: (url: string) => Response) {
  vi.stubGlobal('fetch', (input: RequestInfo | URL) => Promise.resolve(impl(String(input))))
}

function geminiOk(text: string) {
  stubGemini((url) =>
    url.includes(':generateContent')
      ? new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), { status: 200 })
      : new Response(JSON.stringify({ models: [{ name: 'models/gemini-3.5-flash-lite' }] }), {
          status: 200,
        }),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('handleAssistant', () => {
  it('answers 503 when the deployment has no key, so the widget degrades quietly', async () => {
    // Not 500: a deployment without model access is a supported configuration,
    // and the widget reads 503 as "use the local engine, say nothing".
    const res = await handleAssistant({ message: 'hi' }, undefined, 'client-503')
    expect(res.status).toBe(503)
    expect(res.body).toEqual({ error: 'not-configured' })
  })

  it('rejects an empty message before spending a model call', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const res = await handleAssistant({ message: '   ' }, KEY, 'client-empty')
    expect(res.status).toBe(400)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('rejects an oversized message', async () => {
    const res = await handleAssistant({ message: 'x'.repeat(MAX_MESSAGE_CHARS + 1) }, KEY, 'client-long')
    expect(res.status).toBe(400)
  })

  it('returns the model text on success', async () => {
    geminiOk('**කනවා** is "to eat".')
    const res = await handleAssistant({ message: 'how do I sign to eat?' }, KEY, 'client-ok')
    expect(res.status).toBe(200)
    expect(res.body.text).toContain('කනවා')
  })

  it('rate limits a single client', async () => {
    geminiOk('ok')
    const client = 'client-flood'
    let lastStatus = 0
    // The limit is 20/minute; 25 attempts must not all succeed.
    for (let i = 0; i < 25; i++) {
      lastStatus = (await handleAssistant({ message: `q${i}` }, KEY, client)).status
    }
    expect(lastStatus).toBe(429)
  })

  it('does not rate limit a different client', async () => {
    geminiOk('ok')
    const res = await handleAssistant({ message: 'hello' }, KEY, 'client-separate')
    expect(res.status).toBe(200)
  })

  it('replaces a key-rejection message rather than forwarding Google’s copy of the key', async () => {
    stubGemini(
      () =>
        new Response(JSON.stringify({ error: { message: `API key ${KEY} is not valid` } }), {
          status: 400,
        }),
    )
    const res = await handleAssistant({ message: 'hi' }, KEY, 'client-leak-known')
    expect(res.status).toBe(502)
    expect(JSON.stringify(res.body)).not.toContain(KEY)
  })

  it('redacts the key from an error whose text is forwarded verbatim', async () => {
    // The belt to the above braces. Unrecognised errors are passed through
    // with Google's own wording, so anything the upstream chose to embed --
    // including the key, which it does echo in some messages -- would reach
    // the browser without this.
    stubGemini(
      () =>
        new Response(JSON.stringify({ error: { message: `upstream failure for key=${KEY} in region x` } }), {
          status: 500,
        }),
    )
    const res = await handleAssistant({ message: 'hi' }, KEY, 'client-leak-verbatim')
    expect(res.status).toBe(502)
    expect(JSON.stringify(res.body)).not.toContain(KEY)
    expect(JSON.stringify(res.body)).toContain('[redacted]')
  })

  it('ignores a malformed history instead of failing the request', async () => {
    geminiOk('ok')
    const res = await handleAssistant(
      { message: 'hi', history: ['not a turn', { role: 'user' }, null] },
      KEY,
      'client-badhistory',
    )
    expect(res.status).toBe(200)
  })
})
