/**
 * The local intent engine — a port of `local_answer` in
 * `services/recognition/webapp/assistant.py`.
 *
 * This is the assistant's floor: it needs no API key, no network and no
 * backend, and it always answers. The optional Gemini layer in `gemini.ts`
 * sits on top of it and is fed by the same retrieval, so a key makes the
 * answers more fluent but never changes which signs are considered real.
 */

import { GENERAL_TIPS, CATEGORY_LABEL, SignKnowledgeBase, norm, tokens } from './kb'
import type { Sign, SignCard } from './kb'

export interface Answer {
  text: string
  cards: SignCard[]
  chips: string[]
  /** Set when the reply came from the cloud model rather than the local engine. */
  via?: 'gemini'
  /** Set when a cloud call was attempted and fell back to the local answer. */
  notice?: string
}

// NOTE: the Sinhala alternatives are matched without a trailing \b — Sinhala
// words often end in a combining mark (e.g. the hal kirima in ආයුබෝවන්), which
// is not a word character, so \b never fires there.
const GREETING_RE =
  /^(hi|hey|hello|yo|hola|ayubowan|aayubowan|good (morning|evening|afternoon))\b|^\s*(ආයුබෝවන්|ආයුබෝවන|හෙලෝ)/i

const THANKS_RE =
  /^\s*(thanks|thank you|thx|ty|cheers|nice|great|awesome|cool|perfect|බොහොම ස්තූතියි|ස්තූතියි)\b|^\s*(ස්තූතියි|බොහොම ස්තූතියි)/i

const CATEGORY_QUERY: Array<[RegExp, string]> = [
  [/\b(letters?|alphabets?|fingerspell\w*|අකුරු)\b/i, 'letter'],
  [/\b(numbers?|digits?|numerals?|counting|ඉලක්කම්|අංක)\b/i, 'number'],
  [/\b(months?|calendar|මාස)\b/i, 'month'],
  [/\b(phrases?|sentences?|verbs?|වචන)\b/i, 'phrase'],
]

const LIST_VERB_RE = /\b(show|list|all|which|what|browse|give|see|display|know)\b/i

const RANDOM_RE =
  /\b(random|surprise me|quiz me|something new|teach me (a|any|some)|give me (a|any) sign|any sign to practi[cs]e)\b/i

const CAPABILITY_RE =
  /\b(what can you do|what do you do|who are you|your name|capabilit\w+|what do you know|how can you help|what are you)\b/i

const TIPS_RE = [
  /\b(tips?|advice|guidance)\b/i,
  /\b(confiden\w+|accura\w+|detect\w+|recogni\w+)\b[^.?!]{0,24}\b(low|bad|poor|not|isn'?t|won'?t|never|fail\w*)\b/i,
  /\b(low|bad|poor|improve|increase|better|raise)\b[^.?!]{0,24}\b(confiden\w+|accura\w+|detect\w+|recogni\w+|result\w*|score)\b/i,
  /\b(model|it|camera)\b[^.?!]{0,20}\b(can'?t|cannot|won'?t|doesn'?t|not)\b[^.?!]{0,20}\b(see|read|detect|recogni\w+)\b/i,
]

const COUNT_RE = /\b(how many|how much|count|total)\b/i
const COUNT_SUBJECT_RE = /\b(sign|gesture|class|label|word)\w*\b/i

// Words that describe *how* the user is asking rather than *what* they're
// asking about. Removing them is what turns "how do I sign to eat?" into the
// search query "eat".
const STOPWORDS = new Set([
  'how', 'do', 'does', 'did', 'i', 'you', 'your', 'sign', 'signs', 'signing',
  'the', 'a', 'an', 'for', 'in', 'on', 'at', 'what', 'whats', 'is', 'are',
  's', 'to', 'say', 'says', 'show', 'me', 'my', 'of', 'please', 'can',
  'could', 'would', 'tell', 'about', 'mean', 'means', 'meaning', 'make',
  'makes', 'perform', 'teach', 'learn', 'gesture', 'gestures', 'sinhala',
  'ssl', 'language', 'translate', 'translation', 'and', 'with', 'there',
  'any', 'give', 'list', 'explain', 'some', 'something', 'random', 'again',
  'practice', 'practise', 'tip', 'tips', 'want', 'need', 'know',
  'this', 'that', 'it', 'sing',
])

/** Reduce a natural question to the bare thing being asked about. */
export function stripQuery(message: string): string {
  const toks = tokens(message)
  // "how do I sign the letter A" / "sign B" — keep the single letter, which
  // STOPWORDS would otherwise swallow ("a" is a stopword).
  const letter = /\b(?:letters?|alphabets?|fingerspell\w*|signs?)\s+(?:the\s+)?(?:letter\s+)?([a-z])\b/i.exec(message)
  if (letter) return letter[1].toLowerCase()
  if (toks.length === 1 && toks[0].length <= 2) return toks[0]
  return toks.filter((t) => !STOPWORDS.has(t)).join(' ').trim()
}

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

function sample<T>(items: T[], n: number): T[] {
  const pool = [...items]
  const out: T[] = []
  while (out.length < n && pool.length) {
    out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0])
  }
  return out
}

/** Answer purely from the local knowledge base. Never throws. */
export function localAnswer(kb: SignKnowledgeBase, message: string): Answer {
  const msg = (message || '').trim()
  const low = msg.toLowerCase()

  if (!msg) {
    return {
      text: 'Ask me about any sign in the dataset and I’ll show you the Sinhala script, the meaning and how to practise it.',
      cards: [],
      chips: ['What signs do you know?', 'Show me the letters', "How do I sign 'to eat'?"],
    }
  }

  // The knowledge base failed to load — say so instead of pretending the
  // dataset is empty, which is what "0 signs" reads like to a user.
  if (!kb.size) {
    return {
      text: 'I couldn’t load the sign index, so I have nothing to answer from right now. Reload the page — if it keeps happening, `public/data/signs.json` is missing from this deployment.',
      cards: [],
      chips: [],
    }
  }

  // 1. Greeting -----------------------------------------------------------
  if (GREETING_RE.test(low)) {
    return {
      text:
        `ආයුබෝවන්! I'm **Suvana AI**, the tutor built into this platform.\n\n` +
        `I know all **${kb.size}** signs the Recognize model was trained on. ` +
        'Ask me how to sign something, what a sign means, or ask for a sign to practise.',
      cards: [],
      chips: ["How do I sign 'to eat'?", 'Show me the letters', 'Teach me a random sign'],
    }
  }

  // 1b. Thanks ------------------------------------------------------------
  if (THANKS_RE.test(msg) && tokens(msg).length <= 3) {
    return {
      text: 'Anytime! Keep practising — ask me for another sign whenever you’re ready.',
      cards: [],
      chips: ['Teach me a random sign', 'Practice tips', 'Show me the letters'],
    }
  }

  // 2. Capability / help --------------------------------------------------
  if (CAPABILITY_RE.test(low)) {
    return {
      text:
        "I'm the built-in tutor for **Suvana**. I can:\n\n" +
        '• **Look up any sign** — "how do I sign *to drink*?"\n' +
        '• **Translate** — "what does *gannawa* mean?"\n' +
        '• **Browse by group** — "show me the numbers"\n' +
        '• **Give you practice tips** so the model reads your sign confidently\n' +
        '• Send you straight to **Learn** to practise it with your camera\n\n' +
        `_${kb.statsLine()}._`,
      cards: [],
      chips: ['Show me the months', "How do I sign 'to write'?", 'Teach me a random sign'],
    }
  }

  // 3. Dataset size -------------------------------------------------------
  if (COUNT_RE.test(low) && COUNT_SUBJECT_RE.test(low)) {
    return {
      text:
        `The Recognize model reads **${kb.size}** distinct signs.\n\n` +
        `${kb.statsLine()}.\n\n` +
        'I can teach you any of them — and Learn scores your attempt against real-signer recordings.',
      cards: [],
      chips: ['Show me the letters', 'Show me the numbers', 'Teach me a random sign'],
    }
  }

  // 4. Random / quiz ------------------------------------------------------
  if (RANDOM_RE.test(low) && kb.size) {
    const entry = pick(kb.entries)
    const gloss = entry.english ? ` (*${entry.english}*)` : ''
    return {
      text:
        `Here's one to practise — **${entry.sinhala}**${gloss}.\n\n` +
        'Perform it in front of the camera in Recognize and watch the confidence bar climb.',
      cards: [kb.card(entry)],
      chips: ['Teach me another one', 'Practice tips', 'Show me the letters'],
    }
  }

  // 5. Category listing ---------------------------------------------------
  for (const [pattern, cat] of CATEGORY_QUERY) {
    const m = pattern.exec(low)
    if (m && (LIST_VERB_RE.test(low) || norm(msg) === norm(m[0]))) {
      const items = kb.categories[cat] ?? []
      const preview = items.slice(0, 12)
      const noun = (CATEGORY_LABEL[cat] ?? cat).toLowerCase()
      return {
        text:
          `The dataset has **${items.length}** ${noun}${items.length !== 1 ? 's' : ''}. ` +
          (items.length > preview.length
            ? 'Here are the first few — ask me about any one for the full breakdown.'
            : 'Here they are.'),
        cards: preview.map((e) => kb.card(e)),
        chips: ['Practice tips', 'Teach me a random sign', 'How many signs do you know?'],
      }
    }
  }

  // 6. Practice tips ------------------------------------------------------
  if (TIPS_RE.some((p) => p.test(low))) {
    const bullets = GENERAL_TIPS.map((t) => `• ${t}`).join('\n')
    return {
      text: `**Getting a clean detection**\n\n${bullets}\n\nIf a sign still won’t register, ask me about it by name and I’ll give you guidance for that sign’s type.`,
      cards: [],
      chips: ['Teach me a random sign', 'Show me the letters', 'How many signs do you know?'],
    }
  }

  // 7. Sign lookup (the main path) ----------------------------------------
  const stripped = stripQuery(msg)
  let results: Sign[] = kb.search(stripped || msg, 6)
  if (!results.length && stripped !== msg) results = kb.search(msg, 6)

  if (results.length) {
    const top = results[0]
    const rest = results.slice(1, 4)
    const gloss = top.english ? ` — *${top.english}*` : ''
    let text =
      `**${top.sinhala}**${gloss}\n\n` +
      `Dataset label \`${top.label}\` · ${CATEGORY_LABEL[top.category] ?? 'Sign'}. ` +
      'The card below has practice guidance for this kind of sign.'
    if (rest.length) {
      text += '\n\nClose matches: ' + rest.map((r) => `**${r.sinhala}**`).join(', ') + '.'
    }
    return {
      text,
      cards: results.slice(0, 4).map((e) => kb.card(e)),
      chips: ['Practice tips', 'Teach me a random sign', 'Show me the letters'],
    }
  }

  // 8. Fallback -----------------------------------------------------------
  const samples = sample(kb.entries, Math.min(3, kb.size))
    .map((e) => `*${e.label}*`)
    .join(', ')
  return {
    text:
      'I couldn’t match that to a sign in this dataset. I only know the ' +
      `**${kb.size}** signs the model was trained on — try the English meaning ` +
      '("how do I sign *to walk*?"), the Romanised Sinhala' +
      (samples ? ` (${samples})` : '') +
      ', or Sinhala script.',
    cards: [],
    chips: ['What can you do?', 'Show me the letters', 'Teach me a random sign'],
  }
}

/** The grounded context handed to the cloud model, if one is configured. */
export function buildContext(kb: SignKnowledgeBase, message: string): string {
  const hits = kb.search(stripQuery(message) || message, 8)
  if (!hits.length) {
    return `CONTEXT: no matching signs found in the dataset.\nDATASET SIZE: ${kb.statsLine()}.`
  }
  const lines = hits.map((e) => {
    const gloss = e.english ? ` | english: ${e.english}` : ''
    return `- label: ${e.label} | sinhala: ${e.sinhala} | type: ${e.category}${gloss}`
  })
  return (
    `DATASET SIZE: ${kb.statsLine()}.\n` +
    "CONTEXT (signs retrieved from this platform's dataset for the user's question):\n" +
    lines.join('\n')
  )
}
