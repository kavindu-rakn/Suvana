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

const MONTH_ORDER = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
]

/**
 * Order the signs within a category for display. Alphabetical is the sensible
 * default, but the months have a canonical sequence everyone knows — showing
 * "April, August, December…" reads as broken. Non-month glosses in the folder
 * (MONTH, YEAR, dataset typos) fall through to the end, alphabetically.
 */
export function orderSigns<T extends { gloss: string }>(category: string, signs: T[]): T[] {
  if (category !== 'Months') return signs
  const rank = (gloss: string) => {
    const i = MONTH_ORDER.indexOf(gloss.toUpperCase())
    return i === -1 ? MONTH_ORDER.length : i
  }
  return [...signs].sort((a, b) => rank(a.gloss) - rank(b.gloss) || a.gloss.localeCompare(b.gloss))
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

/**
 * Categories smaller than this are folded into "Other" in the picker grid.
 *
 * The corpus has three categories holding a single sign each — Conjunctions,
 * Determiner, Interjection — and as tiles they claimed the same row slot, and
 * the same visual weight, as Verbs (144). Folding is a *display* decision only:
 * the sign keeps its real category, which the picker shows on the card, and
 * nothing here changes categoryOf(), the Progress filter or the session model.
 */
const MIN_PICKER_CATEGORY = 3

export interface PickerGroups<T> {
  /** Category names in display order. */
  order: string[]
  /** Signs per displayed category — already folded. */
  byCategory: Map<string, T[]>
}

/**
 * Group references for the two-step picker grid.
 *
 * Ordered by size, largest first, rather than alphabetically: the grid sits
 * behind a search box, so scanning for the categories worth opening beats
 * alphabetical lookup. "Other" and the learner's own recordings are pinned to
 * the end — both are destinations you go to deliberately, not ones you browse.
 */
export function groupForPicker<T extends Categorisable>(recs: T[]): PickerGroups<T> {
  const raw = new Map<string, T[]>()
  for (const rec of recs) {
    const cat = categoryOf(rec)
    const list = raw.get(cat)
    if (list) list.push(rec)
    else raw.set(cat, [rec])
  }

  const byCategory = new Map<string, T[]>()
  for (const [cat, list] of raw) {
    const fold =
      cat !== MY_RECORDINGS && cat !== UNCATEGORISED && list.length < MIN_PICKER_CATEGORY
    const target = fold ? UNCATEGORISED : cat
    const existing = byCategory.get(target)
    if (existing) existing.push(...list)
    else byCategory.set(target, [...list])
  }

  const pin = (name: string) => (name === MY_RECORDINGS ? 2 : name === UNCATEGORISED ? 1 : 0)
  const order = [...byCategory.keys()].sort((a, b) => {
    const byPin = pin(a) - pin(b)
    if (byPin !== 0) return byPin
    const bySize = (byCategory.get(b)?.length ?? 0) - (byCategory.get(a)?.length ?? 0)
    return bySize !== 0 ? bySize : a.localeCompare(b)
  })

  return { order, byCategory }
}

/** True when a sign sits in the picker's "Other" bucket but has a real category
 *  of its own worth showing on its card. */
export function foldedCategoryOf(rec: Categorisable): string | null {
  const cat = categoryOf(rec)
  return cat === UNCATEGORISED ? null : cat
}
