import { existsSync, readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { RecordingMeta } from '../vision/types'

// Guards the contract between scripts/build-reference-index.mjs and the app:
// the index is what every view reads instead of 18.5 MB of frames, so if it
// drifts from the reference files on disk the app shows a corpus that is not
// there — or, worse, silently drops a licence.

const refDir = join(process.cwd(), 'public', 'references')
const indexPath = join(process.cwd(), 'public', 'reference-index.json')

const indexExists = existsSync(indexPath)

describe.skipIf(!indexExists)('reference index', () => {
  const raw = JSON.parse(readFileSync(indexPath, 'utf8')) as {
    version: number
    sources: Record<string, Partial<RecordingMeta>>
    recordings: RecordingMeta[]
  }
  // Mirrors unpack() in bundledReferences.ts: provenance fields constant within
  // a corpus live once under `sources`. Every assertion below is about what the
  // app actually sees, so it runs against the merged view.
  const index: RecordingMeta[] = raw.recordings.map((rec) => {
    const shared = rec.source ? raw.sources[rec.source] : undefined
    return shared ? { ...shared, ...rec } : rec
  })
  const manifest = JSON.parse(readFileSync(join(refDir, 'manifest.json'), 'utf8')) as {
    files: string[]
  }

  it('stays within the per-reference size budget', () => {
    // UIUX-PLAN.md §5. Every learner fetches this on first paint, so it is a
    // real cost and the plan asks for budgets that can fail rather than be
    // hoped at. This is the one budget in that table checked automatically.
    //
    // Per reference, not a flat total: a flat budget cannot tell "the index got
    // fatter" from "there are more signs", and those want opposite responses.
    // The flat 20 kB version failed the moment the corpus grew 362 -> 501, at a
    // point when the per-reference cost had actually improved 63.5 -> 44.5 B.
    //
    // If this fails, find out which field grew before raising the number —
    // `gzipSync` each field out in turn to attribute the cost. Raising the
    // budget to match whatever it currently measures makes it decorative.
    const BUDGET_BYTES_PER_REFERENCE = 50

    const gzipped = gzipSync(readFileSync(indexPath)).length
    const perReference = gzipped / index.length

    expect(
      perReference,
      `index is ${(gzipped / 1024).toFixed(1)} kB gzip for ${index.length} references ` +
        `= ${perReference.toFixed(1)} B each, over the ${BUDGET_BYTES_PER_REFERENCE} B budget`,
    ).toBeLessThanOrEqual(BUDGET_BYTES_PER_REFERENCE)
  })

  it('hoists provenance into a source table instead of repeating it per entry', () => {
    // The index is fetched on first paint by every learner, and UIUX-PLAN.md §5
    // budgets it at 20 kB gzip. Repeating attribution/licence/dataset/note on
    // all 501 entries cost ~44% of the raw file to carry two distinct values.
    expect(raw.version).toBe(2)
    expect(Object.keys(raw.sources).length).toBeGreaterThan(0)

    // Nothing may be lost by the hoist: every entry still resolves a licence
    // and attribution through the merge, whatever it carries inline.
    for (const entry of index) {
      if (entry.source !== 'kaggle-dataset' && !entry.file?.startsWith('yohan_')) continue
      expect(entry.licence, `licence for ${entry.file}`).toBeTruthy()
      expect(entry.attribution, `attribution for ${entry.file}`).toBeTruthy()
    }

    // And the hoisted fields really are absent from the raw entries — otherwise
    // the merge works but the saving never materialised.
    const stillInline = raw.recordings.filter((r) => 'attribution' in r || 'licence' in r)
    expect(stillInline.map((r) => r.file)).toEqual([])
  })

  it('describes every recording listed in the manifest, exactly once', () => {
    const indexed = index.map((e) => e.file).sort()
    expect(indexed).toEqual([...manifest.files].sort())
  })

  it('carries no frames — that is the entire point of it', () => {
    expect(index.every((e) => !('frames' in e))).toBe(true)
  })

  it('reports a frameCount matching the file it came from', () => {
    // Sampled rather than exhaustive: reading all 362 files is the cost this
    // index exists to avoid, and a drift would not affect only one file.
    const sample = index.filter((_, i) => i % 37 === 0)
    expect(sample.length).toBeGreaterThan(5)
    for (const entry of sample) {
      const raw = JSON.parse(readFileSync(join(refDir, entry.file!), 'utf8')) as {
        frames: unknown[]
      }
      expect(entry.frameCount, `frameCount for ${entry.file}`).toBe(raw.frames.length)
    }
  })

  it('preserves licence and attribution on every dataset recording', () => {
    // CLAUDE.md: two corpora, two licences — kaggle_* is CC0, yohan_* is
    // CC BY-NC-SA 4.0 (non-commercial). The Library credits them from the index
    // alone, so losing these fields here would silently strip attribution.
    const dataset = index.filter((e) => e.source === 'kaggle-dataset' || e.file!.startsWith('yohan_'))
    expect(dataset.length).toBeGreaterThan(0)
    const unlicensed = dataset.filter((e) => !e.licence || !e.attribution)
    expect(unlicensed.map((e) => e.file)).toEqual([])
  })

  it('matches the corpus size the hero advertises to the learner', () => {
    // Hero.tsx hardcodes these two numerals. They silently went stale when the
    // corpus grew from 351/362 to 490/501 — a wrong claim on the first screen
    // a participant sees, which is exactly the kind of thing a pilot should not
    // be running on. Deriving them at runtime would mean fetching the whole
    // index on the hero, so the numbers stay hardcoded and this test is what
    // keeps them honest. If it fails, update Hero.tsx — do not relax the test.
    const hero = readFileSync(join(process.cwd(), 'src', 'components', 'Hero.tsx'), 'utf8')
    const distinctGlosses = new Set(index.map((e) => e.gloss)).size

    expect(hero, `hero should advertise ${distinctGlosses} signs`).toContain(
      `<strong>${distinctGlosses}</strong> signs`,
    )
    expect(hero, `hero should advertise ${index.length} recordings`).toContain(
      `<strong>${index.length}</strong> reference recordings`,
    )
    expect(hero, `the "Choose a sign" step should say ${distinctGlosses}`).toContain(
      `Pick from ${distinctGlosses} signs`,
    )
  })

  it('keeps the fields the picker and the selection rule depend on', () => {
    for (const entry of index) {
      expect(typeof entry.gloss, entry.file).toBe('string')
      expect(entry.gloss.length, entry.file).toBeGreaterThan(0)
      expect(typeof entry.durationMs, entry.file).toBe('number')
      expect(typeof entry.frameCount, entry.file).toBe('number')
      expect(typeof entry.createdAt, entry.file).toBe('string')
    }
  })
})

// A skipped suite is easy to mistake for a passing one, so say why out loud.
describe.skipIf(indexExists)('reference index (not built)', () => {
  it('is missing — run `node scripts/build-reference-index.mjs`', () => {
    expect(indexExists, `${indexPath} does not exist. It is generated by the predev/prebuild/pretest hooks.`).toBe(true)
  })
})
