// scripts/curriculum-report.mjs
//
// Curriculum analysis and generation script (L-09).
// Evaluates the reference index and translations, prints:
//  1. Exact count of verified meanings (resolving ~40 vs ~75 note).
//  2. Per-category tables: gloss, licence, hands, motion, hasMeaning.
//  3. Scenario coverage table for the 5 proposal scenarios by licence.
//  4. Writes data-derived units into src/data/curriculum.ts, approved by kvn (14 Oct).
//
// Run with --check to verify the generated file without writing it.
// Rule bounds:
//  - U1 Starter: kaggle_* AND (verified meaning OR self-explaining) AND 1 hand AND still;
//    5-8 signs, easiest first by duration.
//  - Later units: by category, normally ordered by measured difficulty.
//    Letters, days, months and number groups use kvn's natural order (15 Oct).
//  - Never invent SSL signs, meanings, or conversational orders.

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const indexPath = join(here, '..', 'public', 'reference-index.json')
const translationsPath = join(here, '..', 'src', 'data', 'translations.ts')
const curriculumOutPath = join(here, '..', 'src', 'data', 'curriculum.ts')

// 1. Read reference index
let indexRaw
try {
  indexRaw = JSON.parse(readFileSync(indexPath, 'utf8'))
} catch (e) {
  console.error(`curriculum-report: could not read ${indexPath}: ${e.message}`)
  process.exit(1)
}

const sources = indexRaw.sources || {}
const recordings = (indexRaw.recordings || []).map((r) => {
  const shared = r.source ? sources[r.source] : {}
  return { ...shared, ...r }
})

// 2. Read verified translations
const translationsSrc = readFileSync(translationsPath, 'utf8')
const verifiedMap = new Map()
const blockMatch = translationsSrc.match(/export const GLOSS_TRANSLATIONS[^{]*\{([\s\S]*?)\n\}/)
if (blockMatch) {
  for (const line of blockMatch[1].split('\n')) {
    const m = line.match(/^\s*(?:'([^']+)'|"([^"]+)"|([A-Za-z0-9_-]+))\s*:\s*['"]([^'"]+)['"]/)
    if (m) {
      const k = m[1] || m[2] || m[3]
      const v = m[4]
      if (k && v && v.trim().length > 0) verifiedMap.set(k.trim(), v.trim())
    }
  }
}

const verifiedCount = verifiedMap.size
const uniqueCorpusGlosses = new Set(recordings.map((r) => r.gloss))
let verifiedInCorpus = 0
for (const g of uniqueCorpusGlosses) {
  if (verifiedMap.has(g)) verifiedInCorpus++
}

console.log('='.repeat(80))
console.log('SUVANA LEARN: CURRICULUM REPORT (K-05)')
console.log('='.repeat(80))
console.log(`Corpus recordings:       ${recordings.length}`)
console.log(`Distinct glosses:        ${uniqueCorpusGlosses.size}`)
console.log(`Verified meanings total: ${verifiedCount} (in translations.ts)`)
console.log(`Verified in corpus:      ${verifiedInCorpus} glosses matched`)
console.log()
console.log('NOTE ON VERIFIED MEANINGS RESOLUTION (~40 vs ~75):')
console.log('An early project note mentioned ~40 verified meanings before kvn expanded and confirmed')
console.log(`translations. Currently, translations.ts defines exactly ${verifiedCount} verified Sinhala-to-English`)
console.log(`translations, of which ${verifiedInCorpus} match unique recordings in the reference corpus.`)
console.log('='.repeat(80))
console.log()

// Helper: check if a gloss is self-explaining (letters A-Z, numbers, calendar months)
const MONTHS = new Set([
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
])
function isSelfExplaining(gloss) {
  if (/^[A-Z]$/.test(gloss)) return true
  if (/^\d+$/.test(gloss)) return true
  if (MONTHS.has(gloss)) return true
  return false
}

// Difficulty comparator for signs
function difficultyRank(r) {
  // 1-hand still (0), 1-hand moving (1), 2-hand still (2), 2-hand moving (3)
  const h = r.hands === 1 ? 0 : 2
  const m = r.motion === 'still' ? 0 : 1
  return h + m
}

function compareByDifficulty(a, b) {
  const ra = difficultyRank(a)
  const rb = difficultyRank(b)
  if (ra !== rb) return ra - rb
  const da = a.durationMs || 0
  const db = b.durationMs || 0
  if (da !== db) return da - db
  return a.gloss.localeCompare(b.gloss)
}

// 3. Deduplicate references by gloss for unit building (prefer kaggle over yohan, longer over shorter)
const bestRefByGloss = new Map()
for (const r of recordings) {
  const existing = bestRefByGloss.get(r.gloss)
  if (!existing) {
    bestRefByGloss.set(r.gloss, r)
  } else {
    // Prefer non-provisional, kaggle over yohan
    const existingIsKaggle = existing.file?.startsWith('kaggle')
    const currentIsKaggle = r.file?.startsWith('kaggle')
    if (!existingIsKaggle && currentIsKaggle) {
      bestRefByGloss.set(r.gloss, r)
    } else if (existingIsKaggle === currentIsKaggle && (r.durationMs || 0) > (existing.durationMs || 0)) {
      bestRefByGloss.set(r.gloss, r)
    }
  }
}

// 4. Build U1 Starter
const u1Candidates = []
for (const r of recordings) {
  if (!r.file?.startsWith('kaggle')) continue
  const hasMeaning = verifiedMap.has(r.gloss)
  const selfExp = isSelfExplaining(r.gloss)
  if ((hasMeaning || selfExp) && r.hands === 1 && r.motion === 'still') {
    if (!u1Candidates.some((c) => c.gloss === r.gloss)) {
      u1Candidates.push(r)
    }
  }
}
u1Candidates.sort((a, b) => (a.durationMs || 0) - (b.durationMs || 0))

console.log('--- U1 STARTER CANDIDATES ---')
console.log(`Hard rule: kaggle_* AND (verified meaning OR self-explaining) AND one hand AND still.`)
console.log(`Found ${u1Candidates.length} candidate signs. Target is 5-8 signs easiest first by duration.`)
for (const c of u1Candidates) {
  const meaningNote = verifiedMap.get(c.gloss) ? `meaning: "${verifiedMap.get(c.gloss)}"` : 'self-explaining'
  console.log(`  - ${c.gloss.padEnd(20)} duration: ${c.durationMs}ms  (${meaningNote})`)
}
console.log()

if (u1Candidates.length < 5) {
  console.warn('WARNING: Fewer than 5 signs qualify for U1! Proposing relaxing motion before relaxing kaggle licence.')
}

const u1Selection = u1Candidates.slice(0, 7) // exactly 7 signs (within 5-8)

// 5. Build the structure approved by kvn in chat, 14 Oct 2026 (K-05).
// A category keeps its existing deduplication and measured display order.
function categoryRefs(category) {
  return [...new Map(recordings.filter((r) => r.sourceCategory === category)
    .map((r) => [r.gloss, r])).values()].sort(compareByDifficulty)
}

// Only reorder existing references; unspecified words keep their measured order.
function orderedFirst(refs, glosses) {
  const positions = new Map(glosses.map((gloss, i) => [gloss, i]))
  return [...refs].sort((a, b) => (positions.get(a.gloss) ?? glosses.length)
    - (positions.get(b.gloss) ?? glosses.length))
}

function numberRefs(category) {
  return categoryRefs(category).sort((a, b) => {
    const aNumber = /^\d+$/.test(a.gloss)
    const bNumber = /^\d+$/.test(b.gloss)
    if (aNumber && bNumber) return Number(a.gloss) - Number(b.gloss)
    return Number(bNumber) - Number(aNumber)
  })
}

const restaurantGlosses = ['KANAWA', 'BONAWA', '500', 'MILADII GANNAWA', 'BILPATHA']
const restaurantRefs = restaurantGlosses.map((g) => bestRefByGloss.get(g)).filter(Boolean).sort(compareByDifficulty)
const alphabetRefs = categoryRefs('A-Z').sort((a, b) => a.gloss.localeCompare(b.gloss))
const dayRefs = orderedFirst(categoryRefs('Days'), [
  'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY',
])
const monthRefs = orderedFirst(categoryRefs('Months'), [...MONTHS, 'MONTH', 'YEAR', 'MRACH'])
const minorCats = new Set(['Determiner', 'Conjunctions', 'Interjection'])
const smallWordRefs = [...new Map(recordings.filter((r) => minorCats.has(r.sourceCategory))
  .map((r) => [r.gloss, r])).values()].sort(compareByDifficulty)

const groups = [
  ['u1-starter', 'Starter', 'Start with a few signs.', 'Starter', u1Selection],
  ['u-greetings', 'Greetings', 'Try a few words for meeting people.', 'Greetings', categoryRefs('Greetings')],
  ['u-numbers', 'First numbers', 'Try the signs in this number group.', 'Numbers', numberRefs('Numbers')],
  ['u-scenario-restaurant', 'Restaurant', 'Try the signs from the restaurant chat.', 'Restaurant', restaurantRefs],
  ['u-additional-words', 'Everyday words and directions', 'Try a few everyday words and directions.', 'Additional words', categoryRefs('Additional words')],
  ['u-alphabet-part1', 'Letters A-M', 'Try the letters in this group.', 'A-Z', alphabetRefs.filter((r) => r.gloss <= 'M')],
  ['u-alphabet-part2', 'Letters N-Z', 'Try the letters in this group.', 'A-Z', alphabetRefs.filter((r) => r.gloss > 'M')],
  ['u-numbers-20-99', 'Numbers 30-90', 'Try these two-digit numbers.', '20-99', numberRefs('20-99')],
  ['u-days', 'Days', 'Try these day and time words.', 'Days', dayRefs],
  ['u-calendar-months', 'Months', 'Try these month and calendar words.', 'Months', monthRefs],
  ['u-colors', 'Colours', 'Try these colour words.', 'Colors', categoryRefs('Colors')],
  ['u-people', 'People and family', 'Try these people and family words.', 'People', categoryRefs('People')],
  ['u-places', 'Places', 'Try these place words.', 'Places', categoryRefs('Places')],
  ['u-vehicles', 'Transport', 'Try words for getting around.', 'Vehicles', categoryRefs('Vehicles')],
  ['u-numbers-large', 'Big numbers', 'Take your time with these bigger numbers.', '100-1 million', numberRefs('100-1 million')],
  ['u-verbs', 'Action words', 'Try a few action words at a time.', 'Verbs', categoryRefs('Verbs')],
  ['u-nouns', 'Things', 'Try a few of these words at a time.', 'Nouns', categoryRefs('Nouns')],
  ['u-adjectives', 'Describing words', 'Try words that describe things.', 'Adjectives', categoryRefs('Adjectives')],
  ['u-adverb', 'Time words', 'Try a few of these words at a time.', 'Adverb', categoryRefs('Adverb')],
  ['u-preposition', 'Position words', 'Try these words, one at a time.', 'Preposition', categoryRefs('Preposition')],
  ['u-grammatical-markers', 'Small words', 'Finish with this short group of words.', 'Other', smallWordRefs],
]

const MAX_UNIT_SIGNS = 12
const TARGET_UNIT_SIGNS = 10
const units = []
for (const [id, title, description, sourceCategory, refs] of groups) {
  if (!refs.length) continue
  // Balance contiguous groups around ten. kvn's sole exception (15 Oct)
  // keeps the thirteen A-M letters together; all other units stay at most twelve.
  const keepAlphabetTogether = id === 'u-alphabet-part1' && refs.length === 13
  const count = refs.length <= MAX_UNIT_SIGNS || keepAlphabetTogether ? 1
    : Math.max(Math.ceil(refs.length / MAX_UNIT_SIGNS), Math.round(refs.length / TARGET_UNIT_SIGNS))
  const size = Math.floor(refs.length / count)
  const extra = refs.length % count
  let offset = 0
  for (let part = 0; part < count; part++) {
    const length = size + (part < extra ? 1 : 0)
    units.push({
      id: count === 1 ? id : `${id}-${part + 1}`,
      title: count === 1 ? title : `${title} ${part + 1}`,
      description,
      status: 'approved',
      signs: refs.slice(offset, offset + length).map((r) => r.gloss),
      sourceCategory,
    })
    offset += length
  }
}

// Fail before writing if a new corpus category is accidentally left out.
const coveredGlosses = new Set(units.flatMap((unit) => unit.signs))
if (coveredGlosses.size !== uniqueCorpusGlosses.size
    || [...uniqueCorpusGlosses].some((gloss) => !coveredGlosses.has(gloss))) {
  throw new Error('Curriculum must contain every corpus gloss, with no new names.')
}
if (u1Selection.length < 5 || u1Selection.length > 8) {
  throw new Error('Starter must contain 5-8 qualifying signs.')
}
if (units.some((unit) => !unit.signs.length || (unit.signs.length > MAX_UNIT_SIGNS
    && !(unit.id === 'u-alphabet-part1' && unit.signs.length === 13)))) {
  throw new Error('Each unit must contain 1-12 signs, except Letters A-M with 13.')
}

// 6. Write curriculum.ts
const curriculumFileContent = `/**
 * Data-derived curriculum units for Suvana Learn.
 * Generated by scripts/curriculum-report.mjs (L-09 / K-05).
 *
 * All units are derived purely by rules from reference landmark data and verified meanings:
 *  - U1 Starter satisfies the hard rule: kaggle_* only, verified meaning or self-explaining,
 *    one hand, still, 5-8 signs, easiest first by duration.
 *  - Categories normally use measured order: one hand before two, still before moving,
 *    then duration. Letters, days, months and number groups use natural order.
 *  - Structure and approved status decided by kvn in chat, 14 Oct; order follow-up 15 Oct.
 *  - Large groups split into balanced, contiguous units near 10 signs; maximum 12,
 *    except Letters A-M, kept together with 13 signs by kvn's decision.
 *  - No gloss, meaning or translation is added, removed or renamed.
 */

export type UnitStatus = 'proposed' | 'approved'

export interface CurriculumUnit {
  id: string
  title: string
  description: string
  status: UnitStatus
  signs: string[]
  sourceCategory?: string
}

export const CURRICULUM_UNITS: CurriculumUnit[] = ${JSON.stringify(units, null, 2)}

/** Look up a curriculum unit by ID */
export function getUnit(id: string): CurriculumUnit | undefined {
  return CURRICULUM_UNITS.find((u) => u.id === id)
}

/** Get the starter unit (U1) */
export function getStarterUnit(): CurriculumUnit {
  return CURRICULUM_UNITS[0]
}
`

if (process.argv.includes('--check')) {
  if (readFileSync(curriculumOutPath, 'utf8') !== curriculumFileContent) {
    throw new Error('curriculum.ts is stale; run node scripts/curriculum-report.mjs.')
  }
  console.log('Generated curriculum is up to date (no files written).')
} else {
  writeFileSync(curriculumOutPath, curriculumFileContent, 'utf8')
}
console.log(`Curriculum: ${units.length} units, ${coveredGlosses.size} unique signs.`)
console.log('--- APPROVED UNIT ORDER ---')
for (const [index, unit] of units.entries()) {
  console.log(`${index + 1}. ${unit.title}: ${unit.signs.length} signs`)
}
console.log()

// 7. Print Per-Category Breakdown Table
console.log('='.repeat(80))
console.log('PER-CATEGORY REFERENCE BREAKDOWN TABLE')
console.log('='.repeat(80))
const catGroups = new Map()
for (const r of recordings) {
  const cat = r.sourceCategory || 'Other'
  if (!catGroups.has(cat)) catGroups.set(cat, [])
  catGroups.get(cat).push(r)
}

for (const [cat, list] of catGroups.entries()) {
  console.log(`\n### Category: ${cat} (${list.length} recordings)`)
  console.log('| Gloss | Licence | Hands | Motion | Meaning? | Translation / Cue |')
  console.log('|---|---|---|---|---|---|')
  const sorted = [...list].sort((a, b) => a.gloss.localeCompare(b.gloss))
  for (const r of sorted) {
    const meaning = verifiedMap.get(r.gloss)
    const meaningCol = meaning ? `"${meaning}"` : isSelfExplaining(r.gloss) ? '(self-explaining)' : '-'
    console.log(`| ${r.gloss} | ${r.licence || '-'} | ${r.hands || 1} | ${r.motion || 'still'} | ${r.hasMeaning ? 'Yes' : 'No'} | ${meaningCol} |`)
  }
}

// 8. Scenario Coverage Table for the 5 Proposal Scenarios
console.log()
console.log('='.repeat(80))
console.log('SCENARIO COVERAGE TABLE (5 PROPOSAL SCENARIOS)')
console.log('Which existing glosses could serve as single-sign turns, grouped by licence.')
console.log('Note: NO conversational order or translated sentences are proposed.')
console.log('='.repeat(80))

const SCENARIO_KEYWORDS = {
  'Healthcare Consultation': {
    regex: /NURSE|DOCTOR|HOSPITAL|MEDICINE|SICK|ASNIIPAI|FEVER|HEADACHE|PAIN|INJURY|BLOOD|CLINIC|HEALTH|CARE|HEAR|SEE|COUGH/,
    desc: 'Consulting a healthcare worker regarding illness, symptoms, and care.',
  },
  'Job Interview': {
    regex: /NAME|WORK|WADA|JOB|STUDY|PAADAM|OFFICE|COMPUTER|LAPTOP|SALARY|EXPERIENCE|WRITE|LIYANAWA|CAN|ME|YOU|READ|QUALIFICATION|COMPANY|HOW ARE YOU|THANK YOU|WELCOME/,
    desc: 'Introducing oneself, discussing work, study, tools, and abilities.',
  },
  'Social Gathering (Introductions)': {
    regex: /HELLO|AYUBOWAN|ME|YOU|YOUR|NAME|WHERE|CAN|FRIEND|WELCOME|THANK|SEE|DAKINAWA|TALK|SMILE|HINAWENAWA|PEOPLE|FAMILY/,
    desc: 'Meeting someone for the first time, greetings, and introductions.',
  },
  'Restaurant': {
    regex: /EAT|KANAWA|DRINK|BONAWA|FOOD|TEA|COFFEE|WATER|RICE|BREAD|PAAN|FISH|MEAT|MAS|BILL|BILPATHA|BUY|MILADII|MONEY|PAY|COST|TABLE|PLATE|PIGANA|RESTAURANT|500|100|SHOP|KADAYA/,
    desc: 'Sitting down, ordering food and drinks, asking price, and settling the bill.',
  },
  'Emergency': {
    regex: /HELP|UDAW|POLICE|FIRE|ACCIDENT|DANGER|HOSPITAL|AMBULANCE|FAST|QUICKLY|STOP|RUN|DUWANAWA|WATER|SICK|ASNIIPAI|DOCTOR|EMERGENCY/,
    desc: 'Alerting bystanders or authorities to urgent hazards, medical needs, or police.',
  },
}

for (const [scenarioName, meta] of Object.entries(SCENARIO_KEYWORDS)) {
  console.log(`\n### Scenario: ${scenarioName}`)
  console.log(`Description: ${meta.desc}`)
  console.log('| Gloss | Licence | Source | Hands | Motion | Meaning / English Cue |')
  console.log('|---|---|---|---|---|---|')

  const matched = recordings.filter((r) => meta.regex.test(r.gloss.toUpperCase()))
  const deduped = [...new Map(matched.map((r) => [r.gloss, r])).values()]
  deduped.sort((a, b) => {
    // Sort CC0 first, then alphabetically
    const la = a.licence === 'CC0-1.0' ? 0 : 1
    const lb = b.licence === 'CC0-1.0' ? 0 : 1
    if (la !== lb) return la - lb
    return a.gloss.localeCompare(b.gloss)
  })

  for (const r of deduped) {
    const meaning = verifiedMap.get(r.gloss)
    const meaningStr = meaning ? `"${meaning}"` : isSelfExplaining(r.gloss) ? '(self-explaining)' : '(unverified)'
    console.log(`| ${r.gloss} | ${r.licence || '-'} | ${r.source || '-'} | ${r.hands || 1} | ${r.motion || 'still'} | ${meaningStr} |`)
  }
}

console.log('\n' + '='.repeat(80))
console.log(process.argv.includes('--check')
  ? 'Curriculum report complete. curriculum.ts verified without writes.'
  : 'Curriculum report complete. curriculum.ts written successfully.')
console.log('='.repeat(80))
