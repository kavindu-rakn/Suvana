import learnIndex from '../../../../services/recognition/webapp/static/learn-glosses.json'

export const SIGNING_REFUSAL = 'Suvana does not describe how signs are made and does not translate into SSL. Use Learn to watch the reference recording instead.'
const LEARN_URL = 'https://suvana.help/learn/'
const glosses = new Set(learnIndex.glosses)

// Request detection is deliberately separate from fuzzy dataset retrieval.
// Preserve the target's case and spelling: a meaning/synonym is not a gloss ID.
const SIGNING_REQUESTS = [
  /\bhow\b[^.!?]*\b(sign|signed|signing|fingerspell)\b/i,
  /\b(describe|explain|demonstrate|show|teach|perform|make)\b[^.!?]*\b(sign|signs|signing|fingerspell\w*|handshape|hand\s*(position|shape|movement)|finger\s*position|palm|pose|position|location|movement|orientation)\b/i,
  /\b(handshape|finger\s*position|hand\s*(position|shape|movement))\b/i,
  /^\s*(please\s+)?sign\s+\S/i,
  /\btranslat\w*\b[^.!?]*\b(ssl|sign\s*language|signing|sinhala\s*sign)\b/i,
]

export function signingRefusal(message: string): { text: string; learnUrl: string; refused: true } | null {
  const sinhala = /(සංඥා|අත්හැඩ|අත් හැඩ|අතේ පිහිටීම|ඇඟිලි පිහිටීම)/u.test(message)
    && /(කෙසේ|කොහොම|පෙන්ව|විස්තර|පැහැදිලි|පරිවර්ත|කරන්න|කියන්න)/u.test(message)
  if (!sinhala && !SIGNING_REQUESTS.some(pattern => pattern.test(message))) return null
  const target = /\btranslate\s+(.+?)\s+(?:in)?to\s+(?:ssl|(?:sinhala\s+)?sign\s*language)[?.!]*$/i.exec(message)?.[1]
    ?? /\b(?:sign|fingerspell)\s+(.+?)[?.!]*$/i.exec(message)?.[1]
    ?? /\b(?:handshape|position|movement)\s+(?:for|of)\s+(.+?)[?.!]*$/i.exec(message)?.[1]
  const candidate = target?.trim().replace(/^["'“‘](.*)["'”’]$/, '$1')
  const learnUrl = candidate && glosses.has(candidate) ? `${LEARN_URL}?sign=${encodeURIComponent(candidate)}` : LEARN_URL
  return { text: SIGNING_REFUSAL, learnUrl, refused: true }
}
