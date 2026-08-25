export const MY_RECORDINGS = 'My recordings'
const UNCATEGORISED = 'Other'

/**
 * Dataset groups that are symbol sets rather than vocabulary: fingerspelled
 * letters and numerals. Everything else — verbs, nouns, colours, days, months,
 * greetings — is a word.
 *
 * Used only to break ties when choosing what to practise. With no attempt
 * history every sign scores the same, so something arbitrary decides the order;
 * alphabetically that is "1, 100, 100 METERS, 1000, 10000", because the
 * corpus's earliest labels are numerals. Preferring words claims only that a
 * beginner meets vocabulary before fingerspelling and numbers — it says nothing
 * about the order *within* either group, which would be inventing a curriculum.
 */
const SYMBOL_CATEGORIES = new Set(['A-Z', 'Numbers', '20-99', '100-1 million'])

/**
 * The gloss matters as well as the category: "100 METERS" and "50 METERS" are
 * filed under Additional words, but a label that opens with a digit is a
 * numeral whatever folder it came from, and alphabetically they sort ahead of
 * every real word.
 */
export function isSymbolLabel(gloss: string, category: string): boolean {
  return SYMBOL_CATEGORIES.has(category) || /^\d/.test(gloss)
}

/** The two fields grouping depends on — so this works on the frameless
 *  bundled index as well as on a fully-loaded recording. */
interface Categorisable {
  source?: string
  sourceCategory?: string
}

/**
 * Which group a reference belongs to in the practice picker. Dataset
 * conversions carry the folder they came from; anything recorded in the browser
 * is the learner's own, which is the grouping that matters to them.
 */
export function categoryOf(rec: Categorisable): string {
  if (rec.source === 'team-recording') return MY_RECORDINGS
  return rec.sourceCategory ?? UNCATEGORISED
}

/** Category names present in a set of references, ordered for display. */
export function categoriesIn(recs: Categorisable[]): string[] {
  const names = [...new Set(recs.map(categoryOf))]
  // The learner's own recordings sort last; everything else alphabetically.
  return names.sort((a, b) => {
    if (a === MY_RECORDINGS) return 1
    if (b === MY_RECORDINGS) return -1
    return a.localeCompare(b)
  })
}
