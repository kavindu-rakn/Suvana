import { describe, expect, it } from 'vitest'
import type { HandFrame, TrackedHand } from '../vision/types'
import { trimTake } from './trimTake'

const HAND: TrackedHand = {
  handedness: 'Right',
  score: 1,
  landmarks: Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5, z: 0 })),
}

/** One frame per character: 'h' = a hand, '.' = no hand; 33 ms apart. */
function take(pattern: string, startMs = 0): HandFrame[] {
  return [...pattern].map((c, i) => ({
    timestampMs: startMs + i * 33,
    hands: c === 'h' ? [HAND] : [],
  }))
}

describe('trimTake', () => {
  it('drops leading and trailing no-hand frames and re-bases time to 0', () => {
    const out = trimTake(take('..hh.h...'))
    expect(out.map((f) => f.hands.length)).toEqual([1, 1, 0, 1])
    expect(out.map((f) => f.timestampMs)).toEqual([0, 33, 66, 99])
  })

  it('keeps gaps inside the tracked span, as the converter does', () => {
    const out = trimTake(take('h...h'))
    expect(out).toHaveLength(5)
  })

  it('re-bases from the first tracked frame, not from the capture start', () => {
    const out = trimTake(take('.h', 1000))
    expect(out).toEqual([{ timestampMs: 0, hands: [HAND] }])
  })

  it('returns [] when no frame has a hand', () => {
    expect(trimTake(take('....'))).toEqual([])
    expect(trimTake([])).toEqual([])
  })

  it('leaves a fully tracked take unchanged and does not mutate its input', () => {
    const input = take('hhh', 500)
    const out = trimTake(input)
    expect(out.map((f) => f.timestampMs)).toEqual([0, 33, 66])
    expect(input[0].timestampMs).toBe(500)
  })
})
