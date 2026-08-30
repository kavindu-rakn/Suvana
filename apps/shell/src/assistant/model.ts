/**
 * The Gemini call, with no environment assumptions.
 *
 * Everything here runs unchanged in a browser and in a serverless function:
 * only `fetch`, no `localStorage`, no `process`. That is the point — the
 * assistant now has two callers. Visitors go through `api/assistant`, which
 * holds Suvana's key server-side so nobody has to bring one; a developer can
 * still put their own key in the widget and call Google directly.
 *
 * The browser-only half (storage, cached resolution, choosing between the two
 * routes) lives in `gemini.ts`, which imports from here.
 */

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models'

/**
 * Model ids retire. A hardcoded one turns into a hard failure the day Google
 * withdraws it — which is exactly what happened to `gemini-2.5-flash`, whose
 * error text arrived in the chat bubble in place of an answer. So this is a
 * *preference*: `pickModel` asks the account what it can actually call and
 * takes the closest available match.
 */
export const PREFERRED_MODEL = 'gemini-3.5-flash-lite'
export const KEYS_URL = 'https://aistudio.google.com/app/apikey'

/** Ceilings applied on both routes, so a proxied request cannot cost more. */
export const MAX_MESSAGE_CHARS = 2000
export const MAX_CONTEXT_CHARS = 8000
export const MAX_HISTORY_TURNS = 8
export const MAX_OUTPUT_TOKENS = 700

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

export interface ModelError {
  message: string
  /** True when the id is the problem, so re-resolving and retrying is worth it. */
  retryable: boolean
}

/** Surface Google's own explanation rather than a generic failure. */
export async function explainError(res: Response): Promise<ModelError> {
  let detail = ''
  try {
    const body = await res.json()
    detail = body?.error?.message ?? ''
  } catch {
    /* non-JSON error body */
  }
  // "no longer available", "not found", "not supported for generateContent" —
  // all mean *this model*, not *this key*.
  const modelProblem =
    res.status === 404 || /model|not found|no longer available|not supported/i.test(detail)

  if (res.status === 400 && /api[ _]?key/i.test(detail)) {
    return { message: 'Google rejected that API key.', retryable: false }
  }
  if (res.status === 401 || res.status === 403) {
    return { message: 'That API key is not authorised for the Gemini API.', retryable: false }
  }
  if (res.status === 429) {
    return { message: 'Gemini’s rate limit is hit — try again in a minute.', retryable: false }
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
  if (!res.ok) throw new Error((await explainError(res)).message)
  const data = await res.json()
  return ((data?.models ?? []) as ListedModel[])
    .filter(
      (m) => !m.supportedGenerationMethods || m.supportedGenerationMethods.includes('generateContent'),
    )
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

export function generateContent(
  key: string,
  model: string,
  message: string,
  history: Turn[],
  context: string,
  signal?: AbortSignal,
): Promise<Response> {
  const contents = history.slice(-MAX_HISTORY_TURNS).map((t) => ({
    role: t.role === 'user' ? 'user' : 'model',
    parts: [{ text: t.content.slice(0, MAX_MESSAGE_CHARS) }],
  }))
  contents.push({ role: 'user', parts: [{ text: message.slice(0, MAX_MESSAGE_CHARS) }] })

  return fetch(`${ENDPOINT}/${model}:generateContent?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    signal,
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: `${SYSTEM_PROMPT}\n\n${context.slice(0, MAX_CONTEXT_CHARS)}` }],
      },
      contents,
      generationConfig: { temperature: 0.6, maxOutputTokens: MAX_OUTPUT_TOKENS },
    }),
  })
}

export function extractText(data: unknown): string {
  const parts =
    (data as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })?.candidates?.[0]
      ?.content?.parts ?? []
  return parts
    .map((p) => p.text ?? '')
    .join('')
    .trim()
}

/**
 * One answer, resolving the model against the key and retrying once if the id
 * has been withdrawn since it was last resolved.
 *
 * `cached` lets a caller keep a resolved id between calls; `onResolved` hands
 * back whatever was actually used so it can be cached again.
 */
export async function askGemini(opts: {
  key: string
  message: string
  history: Turn[]
  context: string
  preferred?: string
  cached?: string
  signal?: AbortSignal
  onResolved?: (model: string) => void
}): Promise<{ text: string; model: string }> {
  const preferred = opts.preferred || PREFERRED_MODEL

  const resolve = async () => {
    try {
      return pickModel(preferred, await listModels(opts.key)) ?? preferred
    } catch {
      // Offline, or a key problem the call itself will report more clearly.
      return preferred
    }
  }

  let model = opts.cached || (await resolve())
  let res = await generateContent(opts.key, model, opts.message, opts.history, opts.context, opts.signal)

  if (!res.ok) {
    const first = await explainError(res)
    if (!first.retryable) throw new Error(first.message)

    // The id has retired since it was resolved. Re-list once and retry, so
    // nobody has to know a model was renamed.
    const next = await resolve()
    if (next === model) throw new Error(first.message)
    model = next
    res = await generateContent(opts.key, model, opts.message, opts.history, opts.context, opts.signal)
    if (!res.ok) throw new Error((await explainError(res)).message)
  }

  const text = extractText(await res.json())
  if (!text) throw new Error('Gemini returned an empty response.')
  opts.onResolved?.(model)
  return { text, model }
}
