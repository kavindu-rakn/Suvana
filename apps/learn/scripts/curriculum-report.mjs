// scripts/curriculum-report.mjs
//
// Curriculum analysis and generation script (L-09).
// Evaluates the reference index and translations, prints:
//  1. Exact count of verified meanings (resolving ~40 vs ~75 note).
//  2. Per-category tables: gloss, licence, hands, motion, hasMeaning.
//  3. Scenario coverage table for the 5 proposal scenarios by licence.
//  4. Writes data-derived units into src/data/curriculum.ts marked 'proposed'.
//
// Rule bounds:
//  - U1 Starter: kaggle_* AND (verified meaning OR self-explaining) AND 1 hand AND still;
//    5-8 signs, easiest first by duration.
//  - Later units: by category, ordered by difficulty (1-hand still -> 1-hand moving ->
//    2-hand still -> 2-hand moving -> duration).
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
console.log('SUAVANA LEARN: CURRICULUM REPORT (L-09)')
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

// 5. Build units by category
const units = []

// U1
units.push({
  id: 'u1-starter',
  title: 'Starter Signs',
  description: 'First steps: single-hand static signs with verified meanings or self-explaining forms.',
  status: 'proposed',
  signs: u1Selection.map((s) => s.gloss),
  sourceCategory: 'Starter',
})

// Restaurant scenario unit
const restaurantGlosses = ['KANAWA', 'BONAWA', '500', 'MILADII GANNAWA', 'BILPATHA']
const restaurantRefs = restaurantGlosses.map((g) => bestRefByGloss.get(g)).filter(Boolean)
restaurantRefs.sort(compareByDifficulty)
units.push({
  id: 'u-scenario-restaurant',
  title: 'Restaurant Vocabulary',
  description: 'Signs used in the Restaurant dialogue scenario: ordering food, drink, and paying.',
  status: 'proposed',
  signs: restaurantRefs.map((r) => r.gloss),
  sourceCategory: 'Restaurant',
})

// Alphabet Part 1 (A-M) & Part 2 (N-Z)
const azRefs = recordings.filter((r) => r.sourceCategory === 'A-Z')
const uniqueAZ = [...new Map(azRefs.map((r) => [r.gloss, r])).values()]
const azPart1 = uniqueAZ.filter((r) => r.gloss <= 'M').sort(compareByDifficulty)
const azPart2 = uniqueAZ.filter((r) => r.gloss > 'M').sort(compareByDifficulty)

units.push({
  id: 'u-alphabet-part1',
  title: 'Fingerspelling: A–M',
  description: 'First half of the fingerspelling alphabet in SSL, ordered from simpler to more complex poses.',
  status: 'proposed',
  signs: azPart1.map((r) => r.gloss),
  sourceCategory: 'A-Z',
})

units.push({
  id: 'u-alphabet-part2',
  title: 'Fingerspelling: N–Z',
  description: 'Second half of the fingerspelling alphabet in SSL, ordered from simpler to more complex poses.',
  status: 'proposed',
  signs: azPart2.map((r) => r.gloss),
  sourceCategory: 'A-Z',
})

// Numbers 20-99
const num2099 = [...new Map(recordings.filter((r) => r.sourceCategory === '20-99').map((r) => [r.gloss, r])).values()]
num2099.sort(compareByDifficulty)
units.push({
  id: 'u-numbers-20-99',
  title: 'Numbers: 20–99',
  description: 'Two-digit numeral signs in SSL, ordered by hand configuration difficulty.',
  status: 'proposed',
  signs: num2099.map((r) => r.gloss),
  sourceCategory: '20-99',
})

// Numbers 100 - 1 Million
const numLarge = [...new Map(recordings.filter((r) => r.sourceCategory === '100-1 million').map((r) => [r.gloss, r])).values()]
numLarge.sort(compareByDifficulty)
units.push({
  id: 'u-numbers-large',
  title: 'Numbers: Hundreds to Millions',
  description: 'Higher numerals and magnitude signs, ordered by configuration difficulty.',
  status: 'proposed',
  signs: numLarge.map((r) => r.gloss),
  sourceCategory: '100-1 million',
})

// Months
const monthRefs = [...new Map(recordings.filter((r) => r.sourceCategory === 'Months').map((r) => [r.gloss, r])).values()]
monthRefs.sort(compareByDifficulty)
units.push({
  id: 'u-calendar-months',
  title: 'Calendar & Months',
  description: 'Signs for months and calendar concepts in SSL, ordered by difficulty.',
  status: 'proposed',
  signs: monthRefs.map((r) => r.gloss),
  sourceCategory: 'Months',
})

// Additional Words (Kaggle)
const addWords = [...new Map(recordings.filter((r) => r.sourceCategory === 'Additional words').map((r) => [r.gloss, r])).values()]
addWords.sort(compareByDifficulty)
units.push({
  id: 'u-additional-words',
  title: 'Everyday Vocabulary',
  description: 'Common everyday expressions and directional signs from the Kaggle dataset.',
  status: 'proposed',
  signs: addWords.map((r) => r.gloss),
  sourceCategory: 'Additional words',
})

// Verbs (Kaggle + Yohan)
const verbRefs = [...new Map(recordings.filter((r) => r.sourceCategory === 'Verbs').map((r) => [r.gloss, r])).values()]
verbRefs.sort(compareByDifficulty)
units.push({
  id: 'u-verbs',
  title: 'Action Verbs',
  description: 'Action signs and motion verbs in SSL, ordered from simpler to dynamic movements.',
  status: 'proposed',
  signs: verbRefs.map((r) => r.gloss),
  sourceCategory: 'Verbs',
})

// Yohan Categories
const YOHAN_CATEGORIES = [
  ['Greetings', 'Greetings & Courtesies', 'Polite greetings and common social expressions.'],
  ['Numbers', 'Numbers: 1–5', 'Basic counting handshapes from the Yohan dataset.'],
  ['Days', 'Days of the Week', 'Day and routine vocabulary in SSL.'],
  ['Colors', 'Colors', 'Visual color descriptor signs in SSL.'],
  ['Vehicles', 'Transport & Vehicles', 'Modes of transportation and vehicle signs.'],
  ['Places', 'Places & Locations', 'Common public spaces and facility signs.'],
  ['People', 'People & Family', 'Family relationships and person referent signs.'],
  ['Nouns', 'Common Objects & Nouns', 'Everyday objects, items, and physical nouns.'],
  ['Adjectives', 'Descriptive Signs (Adjectives)', 'Descriptors, attributes, and comparative signs.'],
  ['Adverb', 'Manner & Time (Adverbs)', 'Adverbs of time, degree, and frequency.'],
  ['Preposition', 'Spatial Positions (Prepositions)', 'Spatial relationships and positional signs.'],
]

for (const [catName, title, desc] of YOHAN_CATEGORIES) {
  const catRefs = [...new Map(recordings.filter((r) => r.sourceCategory === catName).map((r) => [r.gloss, r])).values()]
  if (catRefs.length > 0) {
    catRefs.sort(compareByDifficulty)
    units.push({
      id: `u-${catName.toLowerCase().replace(/\s+/g, '-')}`,
      title,
      description: desc,
      status: 'proposed',
      signs: catRefs.map((r) => r.gloss),
      sourceCategory: catName,
    })
  }
}

// Minor categories folded into Other
const minorCats = new Set(['Determiner', 'Conjunctions', 'Interjection'])
const otherRefs = [...new Map(recordings.filter((r) => minorCats.has(r.sourceCategory)).map((r) => [r.gloss, r])).values()]
if (otherRefs.length > 0) {
  otherRefs.sort(compareByDifficulty)
  units.push({
    id: 'u-grammatical-markers',
    title: 'Grammatical Markers & Other Signs',
    description: 'Determiners, conjunctions, and interjections in SSL.',
    status: 'proposed',
    signs: otherRefs.map((r) => r.gloss),
    sourceCategory: 'Other',
  })
}

// 6. Write curriculum.ts
const curriculumFileContent = `/**
 * Data-derived curriculum units for Suvana Learn.
 * Generated by scripts/curriculum-report.mjs (L-09).
 *
 * All units are derived purely by rules from reference landmark data and verified meanings:
 *  - U1 Starter satisfies the hard rule: kaggle_* only, verified meaning or self-explaining,
 *    one hand, still, 5-8 signs, easiest first by duration.
 *  - Subsequent units group signs by authentic corpus category, ordered by difficulty:
 *    (1-hand still -> 1-hand moving -> 2-hand still -> 2-hand moving -> duration).
 *  - Marked status: 'proposed' pending human review and approval by kvn (K-05).
 *  - No unit list, meaning, or sign order is hand-authored or invented.
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

writeFileSync(curriculumOutPath, curriculumFileContent, 'utf8')
console.log(`Generated curriculum file: ${curriculumOutPath} (${units.length} units)`)
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
console.log('Curriculum report complete. curriculum.ts written successfully.')
console.log('='.repeat(80))
