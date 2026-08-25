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
  // Keep every field except the frames, so a new field added by the converter
  // reaches the app without anyone having to edit this script. frameCount
  // replaces frames.length, which the reference-selection rule needs in order
  // to compare capture rates without loading any frames.
  const { frames, ...meta } = rec
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

writeFileSync(outPath, JSON.stringify(entries))

const kb = (n) => `${(n / 1024).toFixed(1)} KB`
const framesTotal = entries.reduce((a, e) => a + e.frameCount, 0)
console.log(
  `Built reference index: ${entries.length} recordings, ${framesTotal} frames described, ` +
    `${kb(JSON.stringify(entries).length)} -> ${outPath}`,
)
