import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { scoreAttempt } from '../scoring/score'
import type { ScoreResult } from '../scoring/score'
import { scoreTurn } from '../scenario/rubric'
import { percentile } from './latency'
import restaurant from '../data/scenarios/restaurant.json'
import type { HandFrame, SignRecording } from '../vision/types'

/**
 * Reproducible measurement of the **scoring stage** of the feedback path, on
 * the real reference corpus.
 *
 * This is the half of the ≤300 ms latency target that can be measured without a
 * camera or a participant, so the measurement and its guardrail assertions run
 * on every `npm test`.
 *
 * **The report is only rewritten when asked for.** `latency-report.md` used to
 * be regenerated on every run, and the consequence showed up in the history:
 * the file was modified by eight consecutive commits, including a theme change,
 * an account change and a repo restructure — none of which touched scoring. A
 * figure quoted in the report was drifting by a millisecond or two per commit
 * purely from whatever else the machine was doing, and being carried along by
 * unrelated work where no reviewer would think to question it.
 *
 * So the numbers now change only when someone decides to re-measure:
 *
 *     BENCH_WRITE=1 npx vitest run scoring.bench      # bash
 *     $env:BENCH_WRITE=1; npx vitest run scoring.bench  # PowerShell
 *
 * Do that on an otherwise idle machine — the figures are sensitive to CPU
 * contention, and a parallel build or a large grep is enough to move the median
 * by ~2x. The report stamps the date it was produced so a reader can tell a
 * deliberate measurement from an incidental one.
 *
 * The assertions below still run every time, so a genuine scoring regression
 * fails the suite whether or not the report is being written.
 *
 * **What this is not.** It is not the end-to-end feedback latency. It excludes
 * landmark inference on the final frame, React's commit and the browser's
 * paint, and it runs in Node on a development machine rather than in a
 * participant's browser. The authoritative end-to-end figure comes from the
 * live instrument (`metrics/useFeedbackLatency.ts`) and is reported in the
 * Progress tab. Quote this one as "scoring stage", never as "feedback latency".
 *
 * Run on its own: npx vitest run scoring.bench
 */
const REFERENCE_DIR = join(process.cwd(), 'public', 'references')

/** How many references to time. The full corpus would take minutes for no
 *  extra signal — the spread comes from one- vs two-handed and clip length. */
const SAMPLE_SIZE = 40
const WARMUP = 3
/** Timings per reference; the median of these is kept, so a GC pause or a
 *  scheduler hiccup on one run cannot masquerade as a slow sign. */
const REPEATS = 3

/** The Practice and Scenario views both capture for this much longer than the
 *  reference, so a slightly slower attempt still fits inside the window. */
const CAPTURE_HEADROOM_MS = 1500
const MIN_CAPTURE_MS = 2500

/**
 * Frame rate to build the stand-in attempt at.
 *
 * This is the attempt side of the n×m DTW matrix and so is half of what drives
 * the cost — and it is *not* the reference's rate. References were converted
 * from dataset video at whatever rate those clips were shot at; a learner's
 * take comes off a webcam, which `useHandTracking` samples once per new video
 * frame. 30 fps is the common webcam default and the rate the capture loop
 * reports in the camera bar. A participant on a 60 fps camera would double the
 * attempt-side length, and the report says so.
 */
const ATTEMPT_FPS = 30

/**
 * Whether this run may rewrite `latency-report.md`. Off by default so a routine
 * `npm test` cannot silently restate a reported research figure — see the
 * header comment.
 */
const WRITE_REPORT = process.env.BENCH_WRITE === '1'

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

const references = loadReferences()
const describeBench = references.length >= 5 ? describe : describe.skip

/**
 * A stand-in for a learner's take, at the length one really has.
 *
 * A learner records for `reference.durationMs + 1500 ms`, so their take carries
 * meaningfully more frames than the reference does — and DTW fills an n×m
 * matrix, so using a reference unchanged as the attempt would time a workload
 * roughly half the real size.
 *
 * The frames are recycled from the reference itself. That is sound here because
 * **the cost of this path depends only on the two sequence lengths, never on
 * the landmark values**: the DTW matrix is n×m regardless, `frameDistance` is
 * fixed cost, and the alignment walk is bounded by n+m. So the timing is
 * representative even though the take is not a real learner's signing. It would
 * be the wrong construction for measuring *scores*, and it is not used for any.
 */
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

/** Evenly spread across the corpus so the sample spans categories and hand counts. */
function spread<T>(items: T[], n: number): T[] {
  if (items.length <= n) return items
  const step = items.length / n
  return Array.from({ length: n }, (_, i) => items[Math.floor(i * step)])
}

/** Median wall-clock cost of `run` over REPEATS executions. */
function timeMs(run: () => void): number {
  const runs: number[] = []
  for (let i = 0; i < REPEATS; i++) {
    const t0 = performance.now()
    run()
    runs.push(performance.now() - t0)
  }
  runs.sort((a, b) => a - b)
  return runs[Math.floor(REPEATS / 2)]
}

function stats(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b)
  return {
    n: sorted.length,
    median: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    max: sorted[sorted.length - 1],
  }
}

const fmt = (ms: number) => `${ms.toFixed(1)} ms`

describeBench('feedback-path scoring cost', () => {
  it('measures both scoring paths and writes the report', () => {
    const sampled = spread(references, SAMPLE_SIZE)

    // Warm up so the figures are steady-state rather than first-call JIT cost.
    for (const ref of sampled.slice(0, WARMUP)) scoreAttempt(syntheticTake(ref), ref)

    // --- Practice: one attempt against one reference -------------------------
    const practice: number[] = []
    const frameCounts: number[] = []
    let twoHanded = 0
    for (const ref of sampled) {
      const take = syntheticTake(ref)
      frameCounts.push(take.frames.length)
      let result: ScoreResult | undefined
      practice.push(
        timeMs(() => {
          result = scoreAttempt(take, ref)
        }),
      )
      if (result?.twoHanded) twoHanded++
    }

    // --- Scenario: the same, plus the rubric's appropriateness pass -----------
    // Appropriateness re-scores the attempt against every competing sign in the
    // scenario vocabulary, so a turn costs roughly (vocabulary size) × a
    // practice score. Restaurant is the scenario that runs on real references.
    const vocabGlosses = new Set(restaurant.turns.map((t) => t.gloss))
    const vocabulary = references.filter((r) => vocabGlosses.has(r.gloss))
    const scenario: number[] = []
    for (const ref of vocabulary) {
      const take = syntheticTake(ref)
      scenario.push(timeMs(() => scoreTurn(take, ref, vocabulary)))
    }

    const p = stats(practice)
    const s = scenario.length > 0 ? stats(scenario) : null
    const f = stats(frameCounts)
    const r = stats(sampled.map((ref) => ref.frames.length))

    if (WRITE_REPORT)
      writeFileSync(
        join(process.cwd(), 'latency-report.md'),
        [
        '# Feedback-path scoring cost',
        '',
        'Generated by `src/metrics/scoring.bench.test.ts`. Do not edit by hand.',
        '',
        `Measured **${new Date().toISOString().slice(0, 10)}**, deliberately, via`,
        '`BENCH_WRITE=1 npx vitest run scoring.bench`. A routine `npm test` runs the',
        'measurement and its assertions but does **not** rewrite this file, so these',
        'figures change only when someone re-measures on purpose.',
        '',
        '## What this measures',
        '',
        'The **scoring stage only** — the DTW work between a finished take and the',
        'reference(s). It is one of three stages in the feedback path:',
        '',
        '| Stage | Measured here? |',
        '|---|---|',
        '| Landmark inference on the final frame | No — needs a camera |',
        '| **DTW scoring** | **Yes, below** |',
        '| React commit + browser paint | No — needs a browser |',
        '',
        'End-to-end feedback latency against the proposal\'s ≤300 ms target is',
        'measured live in the app (`src/metrics/useFeedbackLatency.ts`) and reported',
        'in the Progress tab. **Do not quote the figures below as feedback latency.**',
        '',
        'Measured in Node on a development machine, not in a participant\'s browser.',
        '',
        '## Results',
        '',
        '| Path | n | median | p95 | max |',
        '|---|---|---|---|---|',
        `| Practice — one attempt vs one reference | ${p.n} | ${fmt(p.median)} | ${fmt(p.p95)} | ${fmt(p.max)} |`,
        s
          ? `| Scenario turn — plus appropriateness over ${vocabulary.length} signs | ${s.n} | ${fmt(s.median)} | ${fmt(s.p95)} | ${fmt(s.max)} |`
          : '| Scenario turn | — | no scenario references on disk | | |',
        '',
        '## What was scored',
        '',
        `- ${p.n} references sampled evenly from the ${references.length} on disk;`,
        `  ${twoHanded} of them two-handed, which runs two DTW alignments per attempt.`,
        '- DTW fills an n×m matrix, so both sequence lengths drive the cost:',
        `  - attempt (n): median ${f.median} frames, up to ${f.max} — the real capture`,
        `    window (reference duration + ${CAPTURE_HEADROOM_MS} ms, minimum ${MIN_CAPTURE_MS} ms)`,
        `    sampled at ${ATTEMPT_FPS} fps;`,
        `  - reference (m): median ${r.median} frames, up to ${r.max}.`,
        `- A participant whose webcam runs at 60 fps doubles n, and with it this cost.`,
        '- Every attempt is scored twice internally — as performed and mirrored —',
        '  so a left-dominant learner is not penalised. That doubling is included.',
        '',
        `Each figure is the median of ${REPEATS} runs per reference, taken after a`,
        'warm-up. That deliberately measures the **cost of the algorithm**, not what',
        'a participant experiences: it strips out the JIT warming up and the odd GC',
        'pause, which on a single cold run inflated the p95 here by roughly 8×. The',
        'number a learner actually waits for is the live end-to-end measurement, and',
        'that one keeps its noise.',
        '',
        '## Reading this',
        '',
        'The spread across signs matters more than the median. DTW is O(n·m) and the',
        'two lengths grow together — a long reference also widens the capture window,',
        'which lengthens the attempt — so cost rises faster than clip duration does.',
        'The slowest signs in the corpus are the ones that set the budget, not the',
        'typical one.',
        '',
        'The scenario path compounds this: appropriateness costs one extra alignment',
        'per competing sign, so its cost scales with the scenario\'s vocabulary. That',
        'is why `scoreTurn` compares within a scenario rather than across the whole',
        'library — the same bound that keeps this number small is also what keeps',
        'appropriateness meaningful. A scenario with a long reference *and* a large',
        'vocabulary is where the budget would first come under pressure, and is the',
        'case to watch as more scenarios are authored.',
        '',
        ].join('\n'),
        'utf8',
      )

    // Guardrails, not the measurement: scoring must stay a small part of the
    // 300 ms budget, and the report must describe a real workload.
    expect(p.n).toBeGreaterThan(4)
    expect(f.median).toBeGreaterThan(0)
    expect(p.p95).toBeLessThan(300)
    if (s) expect(s.p95).toBeLessThan(300)
  })
})
