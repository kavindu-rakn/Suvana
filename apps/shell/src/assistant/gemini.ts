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

/**
 * Model ids retire. A hardcoded one turns into a hard failure the day Google
 * withdraws it — which is exactly what happened to `gemini-2.5-flash`, whose
 * error told us to migrate. So this is a *preference*, not a requirement:
 * `resolveModel` asks the account which models it can actually call and picks
 * the closest available match, and the result is cached per browser.
 */
export const PREFERRED_MODEL = 'gemini-3.5-flash-lite'
export const KEYS_URL = 'https://aistudio.google.com/app/apikey'

const KEY_STORAGE = 'suvana.assistant.geminiKey'
const MODEL_STORAGE = 'suvana.assistant.geminiModel'
const RESOLVED_STORAGE = 'suvana.assistant.geminiResolved'

/**
 * How to answer. The retrieval already decides *which* signs are real; this
 * decides what a good reply looks like, because the useful failure mode of a
 * grounded model is not hallucination, it is a wall of text that buries the
 * one sign the learner asked about.
 */
export const SYSTEM_PROMPT = `You are "Suvana AI", the tutor built into Suvana — a Sri Lankan Sign Language (SSL) platform from a university research project. Suvana has four modules: Recognize (sign to speech), Communicate (speech to a 3D signing avatar), Learn (camera practice scored against real-signer recordings) and Alerts (a phone app for sound awareness and SOS).

GROUND TRUTH
- The CONTEXT block is retrieved from Suvana's own dataset and is the only evidence about which signs exist. Never claim a sign exists unless it is in CONTEXT, and never invent or guess a Sinhala translation.
- Never describe a specific handshape, finger position or movement path. You do not have that reference data and a wrong description teaches the learner the wrong sign. Give practice guidance instead: framing, lighting, holding the sign for the whole capture window, movement pacing.
- If CONTEXT is empty and the question is about a particular sign, say plainly that it is not in this dataset, and invite them to try the English meaning, the Romanised Sinhala or Sinhala script.

HOW TO ANSWER
- Lead with the answer. For a sign lookup that is the Sinhala script and its English meaning, in the first sentence.
- Two to four sentences, or up to four short bullets. This is a chat bubble beside a card that already lists the practice tips — do not repeat them.
- Do not restate the question, do not open with "Great question", and do not close by offering further help. The suggestion chips do that.
- A card with the sign's details is rendered directly below your reply, so never say "see below" or describe the card.
- Point the learner at the module that does the thing: Learn to practise with scoring, Recognize to check the model reads them, Communicate for speech to avatar, Alerts for the phone app.

STYLE
- Warm and direct, like a patient teacher. Sinhala script freely — the user reads Sinhala.
- Light markdown only: **bold**, bullets with •, \`code\` for a dataset label. No headings, no tables, no code fences.
- Never use a sub-brand name (Sawana, SignSpeak, SoundGuard). The modules are Recognize, Communicate, Learn and Alerts.

EXAMPLE
User: how do I sign to eat?
You: **කනවා** is "to eat" — dataset label \`kanawa\`, a movement sign. Perform it once cleanly from a neutral rest position and hold the end of the movement, since the model reads the whole motion rather than a single frame. Practise it in Learn to get it scored against a real signer.`

export interface Turn {
  role: 'user' | 'assistant'
  content: string
}

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

/** Surface Google's own explanation rather than a generic failure. */
async function explain(res: Response): Promise<{ message: string; retryable: boolean }> {
  let detail = ''
  try {
    const body = await res.json()
    detail = body?.error?.message ?? ''
  } catch {
    /* non-JSON error body */
  }
  // "no longer available", "not found", "not supported for generateContent" —
  // all mean *this model*, not *this key*, so re-resolving is worth a retry.
  const modelProblem =
    res.status === 404 || /model|not found|no longer available|not supported/i.test(detail)

  if (res.status === 400 && /api[ _]?key/i.test(detail)) {
    return { message: 'Google rejected that API key.', retryable: false }
  }
  if (res.status === 401 || res.status === 403) {
    return { message: 'That API key is not authorised for the Gemini API.', retryable: false }
  }
  if (res.status === 429) {
    return { message: 'Gemini’s free-tier rate limit is hit — try again in a minute.', retryable: false }
  }
  if (modelProblem) {
    return { message: detail || `Model unavailable (HTTP ${res.status}).`, retryable: true }
  }
  return { message: detail || `Gemini returned HTTP ${res.status}.`, retryable: false }
}

interface ListedModel {
  name: string
  supportedGenerationMethods?: string[]
}

/** Every model this key may call with generateContent. */
export async function listModels(key: string): Promise<string[]> {
  const res = await fetch(`${ENDPOINT}?key=${encodeURIComponent(key)}&pageSize=200`)
  if (!res.ok) throw new Error((await explain(res)).message)
  const data = await res.json()
  return ((data?.models ?? []) as ListedModel[])
    .filter((m) => !m.supportedGenerationMethods || m.supportedGenerationMethods.includes('generateContent'))
    .map((m) => m.name.replace(/^models\//, ''))
}

/**
 * Pick the best available stand-in for the preferred model.
 *
 * Ordering matters more than it looks: "flash-lite" is the cheapest tier and
 * the one this assistant is sized for (short, grounded answers), so a missing
 * flash-lite should fall to another flash-lite before it falls to a full
 * flash. Within a tier, the highest version number wins.
 */
export function pickModel(preferred: string, available: string[]): string | null {
  if (!available.length) return null
  if (available.includes(preferred)) return preferred

  const gemini = available.filter((m) => /^gemini-/.test(m))
  if (!gemini.length) return null

  const version = (m: string) => {
    const n = /gemini-(\d+(?:\.\d+)?)/.exec(m)
    return n ? parseFloat(n[1]) : 0
  }
  // Anything experimental, dated or preview is a worse default than a stable id.
  const stable = (m: string) => !/preview|exp|latest|\d{4}/.test(m)

  const tiers = [
    (m: string) => m.startsWith(preferred),
    (m: string) => /flash-lite/.test(m),
    (m: string) => /flash/.test(m),
    () => true,
  ]

  // Stable ids are tried across every tier before any unstable one is
  // considered — a dated preview of exactly the requested model is the thing
  // most likely to be withdrawn next, which is the failure this function
  // exists to absorb. So a stable newer flash-lite beats a preview build of
  // the preferred id, even though the preview matches the name more closely.
  for (const requireStable of [true, false]) {
    for (const inTier of tiers) {
      const hits = gemini.filter((m) => inTier(m) && (!requireStable || stable(m)))
      if (!hits.length) continue
      hits.sort((a, b) => version(b) - version(a) || a.length - b.length)
      return hits[0]
    }
  }
  return null
}

/** The model id to actually call, resolved against the account and cached. */
export async function resolveModel(key: string): Promise<string> {
  const cached = read(RESOLVED_STORAGE)
  if (cached) return cached
  const preferred = readModelPreference()
  try {
    const resolved = pickModel(preferred, await listModels(key))
    if (resolved) {
      write(RESOLVED_STORAGE, resolved)
      return resolved
    }
  } catch {
    /* offline or key trouble — let the call itself report it */
  }
  return preferred
}

async function generate(
  key: string,
  model: string,
  message: string,
  history: Turn[],
  context: string,
  signal?: AbortSignal,
): Promise<Response> {
  const contents = history.slice(-8).map((t) => ({
    role: t.role === 'user' ? 'user' : 'model',
    parts: [{ text: t.content }],
  }))
  contents.push({ role: 'user', parts: [{ text: message }] })

  return fetch(`${ENDPOINT}/${model}:generateContent?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    signal,
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: `${SYSTEM_PROMPT}\n\n${context}` }] },
      contents,
      generationConfig: { temperature: 0.6, maxOutputTokens: 700 },
    }),
  })
}

function extract(data: unknown): string {
  const parts = (data as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })
    ?.candidates?.[0]?.content?.parts ?? []
  return parts.map((p) => p.text ?? '').join('').trim()
}

export async function callGemini(
  key: string,
  message: string,
  history: Turn[],
  context: string,
  signal?: AbortSignal,
): Promise<{ text: string; model: string }> {
  let model = await resolveModel(key)
  let res = await generate(key, model, message, history, context, signal)

  if (!res.ok) {
    const first = await explain(res)
    if (!first.retryable) throw new Error(first.message)

    // The cached id has retired since it was resolved. Re-list once and retry,
    // so the user never has to know a model was renamed.
    write(RESOLVED_STORAGE, '')
    const next = await resolveModel(key)
    if (next === model) throw new Error(first.message)
    model = next
    res = await generate(key, model, message, history, context, signal)
    if (!res.ok) throw new Error((await explain(res)).message)
  }

  const text = extract(await res.json())
  if (!text) throw new Error('Gemini returned an empty response.')
  return { text, model }
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
          ? `Key accepted — answers will come from ${chosen}.`
          : `Key accepted. ${preferred} is not available to this key, so ${chosen} will be used.`,
    }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Could not reach Google.' }
  }
}
