import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { scoreAttempt } from './score'
import type { SignRecording } from '../vision/types'

/**
 * Guards the converted dataset references (tools/convert_references.py).
 *
 * A reference that the app cannot score is worse than no reference — it would
 * teach the learner the wrong thing. These checks are the handoff's
 * "verify numerically, not by eye" step, kept in the suite so a bad conversion
 * can never land silently.
 */
const REFERENCE_DIR = join(process.cwd(), 'public', 'references')

function loadReferences(): SignRecording[] {
  let names: string[]
  try {
    names = readdirSync(REFERENCE_DIR).filter((n) => n.endsWith('.json') && n !== 'manifest.json')
  } catch {
    return []
  }
  return names.map(
    (name) => JSON.parse(readFileSync(join(REFERENCE_DIR, name), 'utf8')) as SignRecording,
  )
}

const references = loadReferences()
const manifest = (() => {
  try {
    return JSON.parse(readFileSync(join(REFERENCE_DIR, 'manifest.json'), 'utf8')) as {
      files: string[]
    }
  } catch {
    return { files: [] }
  }
})()

// The suite must stay green before any references are committed, so these are
// skipped when the folder is empty rather than failing the build.
const hasReferences = references.length > 0
const describeRefs = hasReferences ? describe : describe.skip

describeRefs('bundled reference recordings', () => {
  it('are all listed in the manifest the app fetches', () => {
    const onDisk = readdirSync(REFERENCE_DIR)
      .filter((n) => n.endsWith('.json') && n !== 'manifest.json')
      .sort()
    expect([...manifest.files].sort()).toEqual(onDisk)
  })

  it('carry the fields the app reads, and their provenance', () => {
    for (const ref of references) {
      expect(typeof ref.gloss, `${ref.gloss}: gloss`).toBe('string')
      expect(ref.gloss.length, `${ref.gloss}: gloss not empty`).toBeGreaterThan(0)
      expect(ref.frames.length, `${ref.gloss}: has frames`).toBeGreaterThan(0)
      expect(ref.durationMs, `${ref.gloss}: has duration`).toBeGreaterThan(0)
      expect(ref.videoWidth, `${ref.gloss}: has width`).toBeGreaterThan(0)
      expect(ref.videoHeight, `${ref.gloss}: has height`).toBeGreaterThan(0)
      // Every committed reference must declare where it came from, so nobody
      // has to guess whether a reference is authoritative SSL.
      expect(typeof ref.source, `${ref.gloss}: declares a source`).toBe('string')
      expect(ref.source?.length, `${ref.gloss}: source not empty`).toBeGreaterThan(0)
    }
  })

  it('record the licence of every dataset-derived reference', () => {
    // Two corpora with different licences are in play, one of which forbids
    // commercial use. A reference that cannot say which it came under is a
    // licensing accident waiting to happen.
    for (const ref of references) {
      if (ref.source === 'team-recording') continue
      const licence = (ref as unknown as { licence?: string }).licence
      expect(licence, `${ref.gloss}: declares a licence`).toBeTruthy()
    }
  })

  it('mark team recordings provisional, and dataset references not', () => {
    // CLAUDE.md: team recordings are test attempts for calibration, not ground
    // truth. An unlabelled team recording could be mistaken for verified SSL in
    // a demo or in the report.
    for (const ref of references) {
      if (ref.source === 'team-recording') {
        expect(ref.provisional, `${ref.gloss}: team recording must be provisional`).toBe(true)
      } else {
        expect(ref.provisional, `${ref.gloss}: dataset reference must not be provisional`).not.toBe(
          true,
        )
      }
    }
  })

  it('start on a tracked hand and hold 21 landmarks per hand', () => {
    for (const ref of references) {
      expect(ref.frames[0].hands.length, `${ref.gloss}: first frame tracked`).toBeGreaterThan(0)
      for (const frame of ref.frames) {
        for (const hand of frame.hands) {
          expect(hand.landmarks.length, `${ref.gloss}: landmark count`).toBe(21)
          expect(['Left', 'Right']).toContain(hand.handedness)
        }
      }
    }
  })

  it('track a hand in most frames', () => {
    // Lead/tail rest frames are trimmed at conversion, so a low figure here
    // means dropouts mid-sign — a reference that would teach the wrong motion.
    // Matches --min-coverage in tools/convert_references.py.
    for (const ref of references) {
      const coverage = ref.frames.filter((f) => f.hands.length > 0).length / ref.frames.length
      expect(coverage, `${ref.gloss}: hand coverage`).toBeGreaterThanOrEqual(0.7)
    }
  })

  it('score a perfect 100 against themselves', () => {
    for (const ref of references) {
      expect(scoreAttempt(ref, ref).score, `${ref.gloss}: self-similarity`).toBe(100)
    }
  })

  it('score lower against a different sign than against themselves, on average', () => {
    // Deliberately an average, not a per-pair rule. Measured cross-sign
    // distances bottom out at 0.134 (30 vs 40) — closer than two takes of the
    // same sign typically are — so some distinct pairs legitimately score full
    // marks. The scorer grades a known target sign; it does not identify which
    // sign was made. Asserting per-pair separation would be asserting something
    // the data says is false.
    const sample = references.slice(0, 8)
    const crossScores: number[] = []
    for (const a of sample) {
      for (const b of sample) {
        if (a.gloss === b.gloss) continue
        crossScores.push(scoreAttempt(a, b).score)
      }
    }
    expect(crossScores.length, 'need at least one distinct pair to compare').toBeGreaterThan(0)
    const meanCross = crossScores.reduce((x, y) => x + y, 0) / crossScores.length
    expect(meanCross, 'a different sign should usually score below a self-match').toBeLessThan(100)
  })
})
