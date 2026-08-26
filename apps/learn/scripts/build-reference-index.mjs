// Builds public/reference-index.json — every reference recording's metadata
// with its frames stripped out.
//
// Why this exists: the app used to fetch all 362 reference files (19.4 MB of
// JSON) just to populate a picker, a library list and a progress dashboard,
// none of which display a single frame. This index is ~90 KB and answers every
// one of those questions; frames are then fetched per sign, on demand.
//
// Runs from the `prebuild` and `predev` npm lifecycle hooks. Node only, no
// dependencies. The output is gitignored — it is derived from the reference
// files and is rebuilt whenever they change.
//
// It deliberately lives OUTSIDE public/references/: vercel.json marks that
// directory `immutable` for a year, which is correct for content-addressed
// recordings but wrong for an index that changes every time the corpus does.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const refDir = join(here, '..', 'public', 'references')
const outPath = join(here, '..', 'public', 'reference-index.json')

const manifestPath = join(refDir, 'manifest.json')
let manifest
try {
  manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
} catch (e) {
  console.error(
    `build-reference-index: could not read ${manifestPath}\n` +
      `${e.message}\n` +
      'manifest.json lists the reference files that ship with the app. It is\n' +
      'produced by the Library tab\'s "Export all for repo" button.',
  )
  process.exit(1)
}

const files = manifest.files ?? []
if (files.length === 0) {
  console.error('build-reference-index: manifest.json lists no files.')
  process.exit(1)
}

// The team's authoring flow is "export from the Library tab, move the files in,
// commit". Forgetting to update manifest.json leaves a recording on disk that
// the app silently never loads, which is easy to miss and hard to debug.
const onDisk = readdirSync(refDir).filter((f) => f.endsWith('.json') && f !== 'manifest.json')
const listed = new Set(files)
const orphans = onDisk.filter((f) => !listed.has(f))
if (orphans.length > 0) {
  console.warn(
    `build-reference-index: ${orphans.length} reference file(s) on disk are not in manifest.json ` +
      'and will NOT ship:\n' +
      orphans.map((f) => `  - ${f}`).join('\n'),
  )
}

/**
 * Fields carried by the reference files that nothing in the app reads.
 *
 * The index is a projection, not an archive: every one of these stays in the
 * reference JSON on disk, where the converter wrote it and where the provenance
 * belongs. Repeating them here only costs first-paint bytes for all 501
 * recordings. Verified against `src/` — no component, hook or store touches any
 * of them. If a view ever needs one, delete it from this list rather than
 * reading the reference file.
 */
const OMIT = ['sourceFile', 'sourceLabel', 'variant']

const entries = []
const missing = []
for (const file of files) {
  let rec
  try {
    rec = JSON.parse(readFileSync(join(refDir, file), 'utf8'))
  } catch {
    missing.push(file)
    continue
  }
  // Keep every field except the frames and the ones listed in OMIT, so a new
  // field added by the converter reaches the app without anyone having to edit
  // this script. frameCount replaces frames.length, which the
  // reference-selection rule needs in order to compare capture rates without
  // loading any frames.
  const { frames, ...meta } = rec
  for (const field of OMIT) delete meta[field]
  // Second precision is all anything reads. The converter writes microseconds
  // (…:10.422494+00:00), which no consumer uses: the Library sorts
  // lexicographically and renders toLocaleDateString(), and the
  // reference-preference rule in references.ts is a `>` between two of these.
  // The extra digits are pure entropy in a file every learner downloads.
  if (typeof meta.createdAt === 'string') {
    const trimmed = meta.createdAt.replace(/\.\d+/, '')
    // Only if it stays a valid, still-ordered timestamp.
    if (!Number.isNaN(Date.parse(trimmed))) meta.createdAt = trimmed
  }
  entries.push({ ...meta, frameCount: Array.isArray(frames) ? frames.length : 0, file })
}

if (missing.length > 0) {
  console.error(
    `build-reference-index: ${missing.length} file(s) in manifest.json could not be read:\n` +
      missing.map((f) => `  - ${f}`).join('\n'),
  )
  process.exit(1)
}

// Stable order so the output does not churn between builds.
entries.sort((a, b) => a.file.localeCompare(b.file))

/**
 * Hoist per-source constants out of the entries.
 *
 * Provenance fields — attribution, licence, sourceDataset, note, signer — are
 * identical for every recording from the same corpus, so carrying them on all
 * 501 entries repeated two distinct values several hundred times each. That was
 * roughly 44% of the raw index, and the index is fetched on first paint by every
 * learner, so it is the one file where this actually costs something.
 *
 * The hoist is DATA-DRIVEN, not a hardcoded field list, because a field being
 * constant is a property of the current corpus rather than of the format.
 * `signer` is the case that proves it: identical to the source id for both
 * dataset corpora today, but a real person's name once team recordings are
 * added, at which point it stops being hoistable on its own. A field moves to
 * the source table only if every entry from that source agrees on it; any entry
 * that differs keeps its own value inline and wins on merge. Nothing can be
 * lost by this, whatever the corpus grows into.
 */
const HOISTABLE = ['source', 'signer', 'sourceDataset', 'licence', 'attribution', 'note']

const sources = {}
for (const entry of entries) {
  const key = entry.source
  // A recording with no source (a browser-recorded one) cannot be grouped, so
  // it simply keeps all its own fields.
  if (typeof key !== 'string' || key.length === 0) continue
  sources[key] ??= {}
}

for (const key of Object.keys(sources)) {
  const group = entries.filter((e) => e.source === key)
  for (const field of HOISTABLE) {
    const first = JSON.stringify(group[0][field] ?? null)
    if (first === 'null') continue
    if (!group.every((e) => JSON.stringify(e[field] ?? null) === first)) continue
    sources[key][field] = group[0][field]
    for (const e of group) delete e[field]
  }
  // `source` is the join key, so it has to survive on the entry even though it
  // is by definition constant within the group.
  sources[key].source = key
  for (const e of group) e.source = key
}

const index = { version: 2, sources, recordings: entries }
writeFileSync(outPath, JSON.stringify(index))

const kb = (n) => `${(n / 1024).toFixed(1)} KB`
const framesTotal = entries.reduce((a, e) => a + e.frameCount, 0)
const hoisted = Object.values(sources).reduce((a, s) => a + Object.keys(s).length - 1, 0)
console.log(
  `Built reference index: ${entries.length} recordings, ${framesTotal} frames described, ` +
    `${hoisted} field(s) hoisted across ${Object.keys(sources).length} source(s), ` +
    `${kb(JSON.stringify(index).length)} -> ${outPath}`,
)
