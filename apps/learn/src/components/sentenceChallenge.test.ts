import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { SENTENCES } from '../data/sentences'
import { toMeta } from '../vision/types'
import type { SignRecording } from '../vision/types'
import { availableSentences, scoreSentenceTake, sentenceCaptureMs } from './sentenceChallenge'

const references = SENTENCES.map(sentence => JSON.parse(readFileSync(`public/references/${sentence.file}`, 'utf8')) as SignRecording)
const reference = references[0]
const metadata = references.map((rec, i) => ({ ...toMeta(rec), file: SENTENCES[i].file }))
const take = { frames: reference.frames, durationMs: reference.durationMs,
  videoWidth: reference.videoWidth, videoHeight: reference.videoHeight, lastFrameAt: null }

describe('whole-sentence challenge contract', () => {
  it('uses exact sentence IDs/files and preserves the dataset list and labels', () => {
    expect(availableSentences([...metadata].reverse())).toEqual(SENTENCES)
    expect(availableSentences(metadata.slice(1))).toEqual(SENTENCES.slice(1))
    expect(availableSentences([{ ...metadata[0], id: 'unrecognised' }])).toEqual([])
    expect(availableSentences([{ ...metadata[0], file: 'unrecognised.json' }])).toEqual([])
    expect(availableSentences([])).toEqual([])
  })
  it('uses twice each actual reference duration without an isolated-sign cap', () => {
    for (const rec of references) expect(sentenceCaptureMs(rec)).toBe(rec.durationMs * 2)
    for (const durationMs of [0, -1, NaN, Infinity]) expect(sentenceCaptureMs({ durationMs })).toBe(0)
    expect(Math.max(...references.map(sentenceCaptureMs))).toBeGreaterThan(20000)
  })
  it('rejects no-hands, single-frame and zero-duration captures before scoring', () => {
    expect(scoreSentenceTake({ ...take, frames: [] }, reference)).toBeNull()
    expect(scoreSentenceTake({ ...take, frames: take.frames.map(frame => ({ ...frame, hands: [] })) }, reference)).toBeNull()
    expect(scoreSentenceTake({ ...take, frames: take.frames.slice(0, 1) }, reference)).toBeNull()
    expect(scoreSentenceTake({ ...take, frames: take.frames.slice(0, 2).map(frame => ({ ...frame, timestampMs: 0 })) }, reference)).toBeNull()
  })
  it('compares one whole real reference, trimming only outer handless frames', () => {
    const scored = scoreSentenceTake({ ...take, frames: [
      { timestampMs: 0, hands: [] }, ...take.frames.map(frame => ({ ...frame, timestampMs: frame.timestampMs + 100 })),
      { timestampMs: reference.durationMs + 200, hands: [] },
    ] }, reference)!
    expect(scored.match.score).toBeCloseTo(100, 5) // Self-comparison control, not calibrated sentence accuracy.
    expect(scored.attempt.gloss).toBe(reference.gloss)
    expect(scored.attempt.sourceCategory).toBe('SSL Sentences')
    expect(scored.attempt.frames).toEqual(reference.frames)
    expect(scored.attempt.durationMs).toBe(reference.durationMs)
    expect(scored.attempt.videoWidth).toBe(reference.videoWidth)
  })
})
