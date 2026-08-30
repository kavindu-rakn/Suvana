/**
 * The optional cloud layer: Google Gemini, called **directly from the browser**.
 *
 * The Python original proxied this through the recognition service, which put
 * a 3 GB TensorFlow container in the path of a text request and made the
 * assistant unavailable whenever that service was down. Going straight to
 * Google removes the dependency entirely and improves the trust story: the
 * key is entered by the user, stored only in their own `localStorage`, and
 * sent only to Google. No Suvana server ever sees it.
 *
 * Gemini's REST endpoint sets permissive CORS headers, so this works from any
 * origin including the static deployment.
 *
 * The local engine still runs first and its retrieval is injected as grounded
 * context, so the model answers about this dataset rather than inventing
 * signs. Every failure path falls back to the local answer — a missing,
 * invalid or rate-limited key must never leave the user without a reply.
 */

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models'

export const DEFAULT_MODEL = 'gemini-2.5-flash'
export const KEYS_URL = 'https://aistudio.google.com/app/apikey'

const STORAGE_KEY = 'suvana.assistant.geminiKey'

export const SYSTEM_PROMPT = `You are "Suvana AI", the built-in tutor inside Suvana — a Sri Lankan Sign Language platform built as a university research project. Suvana has four modules: Recognize (sign to speech), Communicate (speech to a 3D signing avatar), Learn (camera practice scored against real-signer references) and Alerts (a companion phone app for sound awareness and SOS).

Your job is to help the user learn and practise the signs this platform's model recognises, and to point them at the right module.

Hard rules:
- The CONTEXT block below is retrieved from the platform's own dataset. It is the only ground truth about which signs exist. Never claim a sign exists if it is not in the dataset, and never invent a Sinhala translation.
- Never invent a specific handshape or finger-position description for a sign. You do not have that reference data. Instead give practice guidance: framing, lighting, holding the sign for the full capture window, movement pacing.
- Keep answers short and warm — 2 to 5 sentences, or a tight bullet list. This is a chat bubble, not an essay.
- Sinhala script may be used freely; the user reads Sinhala.
- Use light markdown (**bold**, bullets with •). No headings, no code fences.
- Never use a sub-brand name (Sawana, SignSpeak, SoundGuard). The modules are Recognize, Communicate, Learn and Alerts.
- If the retrieved context is empty and the question is about a specific sign, say plainly that it is not in this dataset.`

export interface Turn {
  role: 'user' | 'assistant'
  content: string
}

export function readKey(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

export function writeKey(key: string): void {
  try {
    if (key) localStorage.setItem(STORAGE_KEY, key)
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* private browsing — the assistant still works locally */
  }
}

/** Surface Google's own explanation rather than a generic failure. */
async function explain(res: Response): Promise<string> {
  let detail = ''
  try {
    const body = await res.json()
    detail = body?.error?.message ?? ''
  } catch {
    /* non-JSON error body */
  }
  if (res.status === 400 && /api key/i.test(detail)) return 'That API key was rejected by Google.'
  if (res.status === 401 || res.status === 403) return 'That API key is not authorised for Gemini.'
  if (res.status === 429) return 'Gemini’s free-tier rate limit is hit — try again shortly.'
  return detail || `Gemini returned HTTP ${res.status}.`
}

export async function callGemini(
  key: string,
  message: string,
  history: Turn[],
  context: string,
  model = DEFAULT_MODEL,
  signal?: AbortSignal,
): Promise<string> {
  const contents = history.slice(-8).map((t) => ({
    role: t.role === 'user' ? 'user' : 'model',
    parts: [{ text: t.content }],
  }))
  contents.push({ role: 'user', parts: [{ text: message }] })

  const res = await fetch(`${ENDPOINT}/${model}:generateContent?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    signal,
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: `${SYSTEM_PROMPT}\n\n${context}` }] },
      contents,
      generationConfig: { temperature: 0.6, maxOutputTokens: 700 },
    }),
  })

  if (!res.ok) throw new Error(await explain(res))

  const data = await res.json()
  const parts = data?.candidates?.[0]?.content?.parts ?? []
  const out = parts.map((p: { text?: string }) => p.text ?? '').join('').trim()
  if (!out) throw new Error('Gemini returned an empty response.')
  return out
}

/** Validate a pasted key without spending a real turn on it. */
export async function verifyKey(key: string): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch(`${ENDPOINT}?key=${encodeURIComponent(key)}`)
    if (!res.ok) return { ok: false, message: await explain(res) }
    return { ok: true, message: 'Key accepted — answers will now come from Gemini.' }
  } catch {
    return { ok: false, message: 'Could not reach Google. Check your connection.' }
  }
}
