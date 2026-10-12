import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { D_PERFECT, D_ZERO, DEFAULT_WEIGHTS, scoreAttempt } from './score'
import type { ScoreResult } from './score'
import type { DistanceWeights } from './score'
import type { HandFrame, SignRecording } from '../vision/types'

/**
 * Raw-data export for the PP2 evaluation figures.
 *
 * The committed reports (`calibration-report.md`, `weight-fit-report.md`,
 * `latency-report.md`) state the *conclusions*. This writes the **underlying
 * measurements** to JSON so they can be plotted — an ROC curve, a distance
 * histogram, a per-sign breakdown — without a chart script ever re-implementing
 * the scorer. Every number here comes out of the same `scoreAttempt` the app
 * calls at runtime.
 *
 * PROTOCOL IS COPIED, NOT INVENTED. Each block below reproduces the sampling of
 * an existing test exactly, so the figures plotted from this file must agree
 * with the numbers already committed in the reports. That agreement is itself a
 * check: if a chart disagrees with `calibration-report.md`, this file is wrong.
 *
 *   pairs        <- calibration.test.ts   (>=2 takes per sign)
 *   weightSweep  <- weights.fit.test.ts   (>=4 takes, first 24 signs)
 *   confusable   <- anchors.probe.test.ts (first 60 bundled references)
 *   scoringCost  <- scoring.bench.test.ts (40 references, median of 3)
 *
 * Opt-in, following the `BENCH_WRITE` precedent: a routine `npm test` should
 * not spend a minute regenerating research data nobody asked for.
 *
 *   EVAL_EXPORT=1 npx vitest run evaluation.export          # bash
 *   $env:EVAL_EXPORT=1; npx vitest run evaluation.export    # PowerShell
 *
 * Output: ../../PP2-presentation/data/raw-metrics.json
 */
const CALIBRATION_DIR = join(process.cwd(), 'calibration')
const REFERENCE_DIR = join(process.cwd(), 'public', 'references')
const OUT_DIR = join(process.cwd(), '..', '..', 'PP2-presentation', 'data')

const ENABLED = process.env.EVAL_EXPORT === '1'

// --- weights.fit.test.ts sampling ---
const FIT_MIN_TAKES = 4
const FIT_MAX_SIGNS = 24
// --- anchors.probe.test.ts sampling ---
const PROBE_SAMPLE = 60
// --- scoring.bench.test.ts sampling ---
const BENCH_SAMPLE = 40
const BENCH_WARMUP = 3
const BENCH_REPEATS = 3
const CAPTURE_HEADROOM_MS = 1500
const MIN_CAPTURE_MS = 2500
const ATTEMPT_FPS = 30

interface Take {
  gloss: string
  recording: SignRecording
}

function loadTakes(): Take[] {
  try {
    return readdirSync(CALIBRATION_DIR)
      .filter((n) => n.endsWith('.json'))
      .sort()
      .map((name) => {
        const recording = JSON.parse(
          readFileSync(join(CALIBRATION_DIR, name), 'utf8'),
        ) as SignRecording
        return { gloss: recording.gloss, recording }
      })
  } catch {
    return []
  }
}

function loadReferences(): SignRecording[] {
  try {
    return readdirSync(REFERENCE_DIR)
      .filter((n) => n.endsWith('.json') && n !== 'manifest.json')
      .sort()
      .map((name) => JSON.parse(readFileSync(join(REFERENCE_DIR, name), 'utf8')) as SignRecording)
  } catch {
    return []
  }
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return NaN
  const i = Math.min(sorted.length - 1, Math.max(0, Math.round((p / 100) * (sorted.length - 1))))
  return sorted[i]
}

/** Best single-threshold accuracy separating positives from negatives. */
function bestCut(pos: number[], neg: number[]): { accuracy: number; cut: number } {
  let best = { accuracy: 0, cut: 0 }
  for (const cut of [...pos, ...neg].sort((a, b) => a - b)) {
    const correct = pos.filter((d) => d <= cut).length + neg.filter((d) => d > cut).length
    const accuracy = correct / (pos.length + neg.length)
    if (accuracy > best.accuracy) best = { accuracy, cut }
  }
  return best
}

/** Verbatim from scoring.bench.test.ts — see its comment for why frames are recycled. */
function syntheticTake(reference: SignRecording): SignRecording {
  const captureMs = Math.max(reference.durationMs + CAPTURE_HEADROOM_MS, MIN_CAPTURE_MS)
  const frameMs = 1000 / ATTEMPT_FPS
  const wanted = Math.round(captureMs / frameMs)
  const frames: HandFrame[] = []
  for (let i = 0; i < wanted; i++) {
    const src = reference.frames[i % reference.frames.length]
    frames.push({ ...src, timestampMs: Math.round(i * frameMs) })
  }
  return {
    ...reference,
    id: `${reference.id}-take`,
    signer: 'learner',
    durationMs: captureMs,
    fps: ATTEMPT_FPS,
    frames,
  }
}

function spread<T>(items: T[], n: number): T[] {
  if (items.length <= n) return items
  const step = items.length / n
  return Array.from({ length: n }, (_, i) => items[Math.floor(i * step)])
}

function timeMs(run: () => void): number {
  const runs: number[] = []
  for (let i = 0; i < BENCH_REPEATS; i++) {
    const t0 = performance.now()
    run()
    runs.push(performance.now() - t0)
  }
  runs.sort((a, b) => a - b)
  return runs[Math.floor(BENCH_REPEATS / 2)]
}

const takes = loadTakes()
const byGloss = new Map<string, Take[]>()
for (const t of takes) byGloss.set(t.gloss, [...(byGloss.get(t.gloss) ?? []), t])
const usable = [...byGloss.entries()].filter(([, ts]) => ts.length >= 2)

describe.skipIf(!ENABLED || usable.length < 2)('evaluation data export', () => {
  it('writes raw-metrics.json', () => {
    // ---- 1. Calibration pairs (calibration.test.ts protocol) ----------------
    // Positives: take i vs take 0 of the same sign — one correct rendition
    // measured against another. Negatives: take 0 of one sign vs take 0 of a
    // different sign — a wrong-sign attempt. The corpus labels itself; no
    // expert annotation is involved, and none is claimed.
    interface Pair {
      gloss: string
      other: string
      label: 0 | 1
      distance: number
      score: number
    }
    const pairs: Pair[] = []
    for (const [gloss, ts] of usable) {
      for (let i = 1; i < ts.length; i++) {
        const r = scoreAttempt(ts[i].recording, ts[0].recording)
        if (Number.isFinite(r.normalizedDistance)) {
          pairs.push({ gloss, other: gloss, label: 1, distance: r.normalizedDistance, score: r.score })
        }
      }
      for (const [otherGloss, others] of usable) {
        if (otherGloss === gloss) continue
        const r = scoreAttempt(ts[0].recording, others[0].recording)
        if (Number.isFinite(r.normalizedDistance)) {
          pairs.push({
            gloss,
            other: otherGloss,
            label: 0,
            distance: r.normalizedDistance,
            score: r.score,
          })
        }
      }
    }

    const pos = pairs.filter((p) => p.label === 1).map((p) => p.distance)
    const neg = pairs.filter((p) => p.label === 0).map((p) => p.distance)
    const overall = bestCut(pos, neg)

    // ---- 2. Per-sign separation -------------------------------------------
    // How well each individual sign is told apart from the rest, judged at the
    // single global threshold the scorer would actually use. Signs below the
    // mean are the ones the reference corpus serves worst.
    const perSign = usable
      .map(([gloss]) => {
        const p = pairs.filter((x) => x.label === 1 && x.gloss === gloss).map((x) => x.distance)
        const n = pairs.filter((x) => x.label === 0 && x.gloss === gloss).map((x) => x.distance)
        const correct =
          p.filter((d) => d <= overall.cut).length + n.filter((d) => d > overall.cut).length
        return {
          gloss,
          takes: byGloss.get(gloss)?.length ?? 0,
          posN: p.length,
          negN: n.length,
          accuracyAtGlobalCut: p.length + n.length > 0 ? correct / (p.length + n.length) : NaN,
          medianPos: percentile([...p].sort((a, b) => a - b), 50),
          medianNeg: percentile([...n].sort((a, b) => a - b), 50),
        }
      })
      .filter((s) => Number.isFinite(s.accuracyAtGlobalCut))

    // ---- 3. Weight sweep (weights.fit.test.ts protocol) ---------------------
    const fitUsable = [...byGloss.entries()]
      .filter(([, ts]) => ts.length >= FIT_MIN_TAKES)
      .slice(0, FIT_MAX_SIGNS)
    const sweepFor = (w: DistanceWeights) => {
      const p: number[] = []
      const n: number[] = []
      for (const [gloss, ts] of fitUsable) {
        for (let i = 1; i < ts.length; i++) {
          const d = scoreAttempt(ts[i].recording, ts[0].recording, w).normalizedDistance
          if (Number.isFinite(d)) p.push(d)
        }
        for (const [otherGloss, others] of fitUsable) {
          if (otherGloss === gloss) continue
          const d = scoreAttempt(ts[0].recording, others[0].recording, w).normalizedDistance
          if (Number.isFinite(d)) n.push(d)
        }
      }
      return bestCut(p, n)
    }
    const weightSweep: Array<{ shape: number; traj: number; accuracy: number; cut: number }> = []
    for (let shape = 0; shape <= 1.0001; shape += 0.1) {
      const w = { shape: Number(shape.toFixed(2)), traj: Number((1 - shape).toFixed(2)) }
      const { accuracy, cut } = sweepFor(w)
      weightSweep.push({ shape: w.shape, traj: w.traj, accuracy, cut })
    }

    // ---- 4. Cross-sign floor (anchors.probe.test.ts protocol) --------------
    // The honest counterweight to the separation figure: some *distinct* signs
    // sit closer together than two takes of one sign typically do. This is why
    // the scorer is presented as a grader, never a classifier.
    const refs = loadReferences()
    const probe = refs.slice(0, PROBE_SAMPLE)
    const cross: Array<{ a: string; b: string; distance: number }> = []
    for (let i = 0; i < probe.length; i++) {
      for (let j = i + 1; j < probe.length; j++) {
        if (probe[i].gloss === probe[j].gloss) continue
        const d = scoreAttempt(probe[i], probe[j]).normalizedDistance
        if (Number.isFinite(d)) cross.push({ a: probe[i].gloss, b: probe[j].gloss, distance: d })
      }
    }
    cross.sort((x, y) => x.distance - y.distance)

    // ---- 5. Scoring cost (scoring.bench.test.ts protocol) -------------------
    // Cost of the algorithm, warmed up. NOT end-to-end feedback latency — that
    // one is measured live in the browser and reported in the Progress tab.
    const sampled = spread(refs, BENCH_SAMPLE)
    for (const ref of sampled.slice(0, BENCH_WARMUP)) scoreAttempt(syntheticTake(ref), ref)
    const scoringCost = sampled.map((ref) => {
      const take = syntheticTake(ref)
      // `twoHanded` comes from the scorer itself, not a guess at the frames —
      // it is what decides whether two DTW alignments run, so it is what the
      // cost actually depends on. Same source the bench report counts.
      let result: ScoreResult | undefined
      const ms = timeMs(() => {
        result = scoreAttempt(take, ref)
      })
      return {
        gloss: ref.gloss,
        source: ref.signer,
        attemptFrames: take.frames.length,
        referenceFrames: ref.frames.length,
        twoHanded: result?.twoHanded ?? false,
        ms,
      }
    })

    mkdirSync(OUT_DIR, { recursive: true })
    writeFileSync(
      join(OUT_DIR, 'raw-metrics.json'),
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          note:
            'Generated by src/scoring/evaluation.export.test.ts. Every distance here comes ' +
            'from the same scoreAttempt() the app runs. Do not edit by hand.',
          scorer: {
            weights: DEFAULT_WEIGHTS,
            anchors: { dPerfect: D_PERFECT, dZero: D_ZERO },
          },
          corpus: {
            signsOnDisk: byGloss.size,
            signsUsed: usable.length,
            takes: takes.length,
            source: 'Yohan Abhishek Sinhala Sign Language dataset',
            licence: 'CC BY-NC-SA 4.0',
            signers: 1,
          },
          separation: { bestCut: overall.cut, accuracy: overall.accuracy },
          pairs,
          perSign,
          weightSweep: {
            signs: fitUsable.length,
            minTakes: FIT_MIN_TAKES,
            points: weightSweep,
          },
          confusable: {
            referencesSampled: probe.length,
            pairs: cross.length,
            closest: cross.slice(0, 15),
            percentiles: {
              p1: percentile(cross.map((c) => c.distance), 1),
              p5: percentile(cross.map((c) => c.distance), 5),
              p50: percentile(cross.map((c) => c.distance), 50),
            },
          },
          scoringCost: {
            referencesTimed: scoringCost.length,
            repeats: BENCH_REPEATS,
            attemptFps: ATTEMPT_FPS,
            environment: 'Node (vitest), development machine — not a participant browser',
            samples: scoringCost,
          },
        },
        null,
        1,
      ),
      'utf8',
    )

    // Guardrails: if these drift, the committed reports and the plotted figures
    // have stopped describing the same system.
    expect(pairs.length).toBeGreaterThan(1000)
    expect(overall.accuracy).toBeGreaterThan(0.7)
    expect(weightSweep).toHaveLength(11)
  })
})
