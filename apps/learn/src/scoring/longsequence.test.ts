import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { scoreAttempt } from './score'
import type { SignRecording } from '../vision/types'

function sixSeconds(file: string): SignRecording {
  const recording = JSON.parse(readFileSync(`public/references/${file}`, 'utf8')) as SignRecording
  const frames = recording.frames.filter(frame => frame.timestampMs <= 6000)
  expect(frames[frames.length - 1]!.timestampMs).toBe(6000)
  return { ...recording, durationMs: 6000, frames }
}

it('scores two real six-second, 25 fps sentence excerpts in under 50 ms (warmed median)', () => {
  // Real K-07 landmarks; excerpts are timing fixtures, never new SSL references.
  const attempt = sixSeconds('kaggle_sent_50_KM_IDIRIYATA_YANNA.json')
  const reference = sixSeconds('kaggle_sent_BARA_KILOGRAM_1_K.json')
  for (let i = 0; i < 5; i++) scoreAttempt(attempt, reference)
  const timings = Array.from({ length: 9 }, () => {
    const start = performance.now()
    const result = scoreAttempt(attempt, reference)
    const elapsed = performance.now() - start
    expect(Number.isFinite(result.score)).toBe(true)
    expect(result.alignment?.length).toBeGreaterThan(0)
    return elapsed
  }).sort((a, b) => a - b)
  console.log(`6s sentence scoring: median=${timings[4]!.toFixed(3)} ms, p90=${timings[8]!.toFixed(3)} ms; frames=${attempt.frames.length}/${reference.frames.length}`)
  expect(timings[4], 'warmed median of 9 full scoreAttempt calls').toBeLessThan(50)
})
