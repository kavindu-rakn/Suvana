/**
 * English meanings for the Sinhala-transliterated dataset labels.
 *
 * The gloss itself is the dataset's own filename and is never invented. These
 * meanings are a *display aid* for hearing learners, who cannot practise a sign
 * whose meaning they do not know.
 *
 * ONLY human-verified meanings belong here. A missing entry simply shows the
 * gloss on its own, which is honest; a guessed entry would teach a learner the
 * wrong word. Do not fill these in from a dictionary or by inference — have a
 * Sinhala speaker confirm each one.
 *
 * Letters (A–Z), numbers and months carry their meaning already and need no
 * entry.
 *
 * Every key is quoted, including single-word ones: several glosses contain
 * spaces, and an unquoted key with a space is a syntax error that takes the
 * whole app down.
 *
 * Verified by kvn (native Sinhala speaker), Aug 2026.
 */
export const GLOSS_TRANSLATIONS: Record<string, string> = {
  '100 METERS': '100 meters',
  '50 METERS': '50 meters',
  ADINAWA: 'pull',
  'ADUM SODANAWA': 'wash clothes',
  AHANAWA: 'ask',
  AMBARANAWA: 'grind',
  ANDINAWA: 'wear',
  ASNIIPAI: 'sick',
  'ATHU GAANAWA': 'clean',
  AWIDINAWA: 'walk',
  'BAG EKA': 'bag',
  BALANAWA: 'look',
  BILPATHA: 'bill',
  BONAWA: 'drink',
  DAKINAWA: 'see',
  DAKUNATA: 'to the right',
  'DAKUNATA HARENNA': 'turn right',
  DENAWA: 'give',
  DUWANAWA: 'run',
  ELLANAWA: 'hang',
  GANNAWA: 'take',
  'GAS KAPANAWA': 'cut trees',
  'GEDARA ISSARAHA': 'in front of house',
  'GEYAK HADANAWA': 'build a house',
  HAARANAWA: 'dig',
  HADANAWA: 'build/make',
  'HATHARAMN HANDIYA': '4-way junction',
  HINAWENAWA: 'smile/laugh',
  IRANAWA: 'tear down',
  'KAAMAK HADANAWA': 'cook',
  KADANAWA: 'break',
  KADAYA: 'shop',
  KANAWA: 'eat',
  'KANDA NAGALA BAHINNA': 'climb a hill and come down',
  KASANAWA: 'scratch',
  'KUNU DAMANAWA': 'litter',
  'LAPTOP EKA': 'laptop',
  LIYANAWA: 'write',
  MAKANAWA: 'erase',
  'MAS MAALU KAPANAWA': 'chop fish/meat',
  'MILADII GANNAWA': 'buy',
  'MUUNA KASANAWA': 'scratch face',
  'MUUNA SOODANAWA': 'wash face',
  NAANAWA: 'bathe',
  NAGITINAWA: 'stand up',
  NURSE: 'nurse',
  'OLUWA KASANAWA': 'scratch head',
  OSAWANAWA: 'lift',
  'PAADAM KARANAWA': 'study',
  'PAAN KAPANAWA': 'cut bread',
  'PAARE IDIRIYATA YANNA': 'go forward',
  PANINAWA: 'jump',
  PEENAWA: 'see',
  'PHONE EKA': 'phone',
  'PIGANA HODANAWA': 'wash dishes',
  PIHINANAWA: 'swim',
  'PITIPASSATA ENNA': 'come backwards',
  'RANDU KARAGANNAWA': 'fight',
  SODANAWA: 'wash',
  SOYNAWA: 'find',
  'SUDU KOLAYAK': 'white paper',
  'THATTU KARANAWA': 'tap',
  'WIYADAM KARANAWA': 'spend',
  YANAWA: 'go',
  'ANDANAWA': 'dressing',
  KOTANAWA: 'crush(mortal and pestle)',
  'THERUM GANNAWA': 'understand',
  THORANAWA: 'choose/pick',
  'UDAW KARANAWA': 'help',
  UTHURANAWA: 'overflow',
  'WAADI WENAWA': 'sit',
  'WADA KARANAWA': 'work',
  WAMA: 'left',
  'WAMAATA HARENNA': 'turn left',
  'WAMATA U TURN EKEN HARENNA': 'turn left with a U-turn',

  // --- still awaiting a meaning ----------------------------------------------
  // Uncomment a line and fill it in once you are sure. Left as-is, the sign
  // simply displays as the bare gloss, which is the safe default.
  // 
}

/** Verified English meaning for a gloss, or undefined if nobody has confirmed one. */
export function translationOf(gloss: string): string | undefined {
  // An empty value counts as "not yet known" — otherwise the UI would render
  // an empty pair of brackets after the gloss.
  return GLOSS_TRANSLATIONS[gloss] || undefined
}

/** "KANAWA (eat)" when a meaning is known, otherwise just "KANAWA". */
export function glossLabel(gloss: string): string {
  const meaning = translationOf(gloss)
  return meaning ? `${gloss} (${meaning})` : gloss
}

/** True if the gloss matches a search term by name or by meaning. */
export function matchesSearch(gloss: string, needle: string): boolean {
  if (needle === '') return true
  const upper = needle.toUpperCase()
  if (gloss.includes(upper)) return true
  const meaning = translationOf(gloss)
  return meaning !== undefined && meaning.toUpperCase().includes(upper)
}
