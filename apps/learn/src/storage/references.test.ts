import { describe, expect, it } from 'vitest'
import { pickReferences } from './references'
import { toMeta } from '../vision/types'
import type { RecordingMeta, SignRecording } from '../vision/types'

// These exercise the rule as it now runs in the app: against frameless
// metadata from the bundled index, before any frames are downloaded.
function rec(
  gloss: string,
  createdAt: string,
  extra: Partial<RecordingMeta> = {},
): RecordingMeta {
  return {
    id: `${gloss}-${createdAt}`,
    gloss,
    signer: 'x',
    createdAt,
    durationMs: 1000,
    fps: 25,
    videoWidth: 1280,
    videoHeight: 720,
    frameCount: 0,
    ...extra,
  }
}

describe('pickReferences', () => {
  it('prefers an authoritative reference over a provisional one, whatever the dates', () => {
    const provisionalButNewer = rec('ME', '2026-09-01', { provisional: true })
    const authoritativeButOlder = rec('ME', '2026-01-01', { source: 'kaggle-dataset' })
    const chosen = pickReferences([provisionalButNewer, authoritativeButOlder]).get('ME')
    expect(chosen).toBe(authoritativeButOlder)
  })

  it('takes the newest when both are provisional', () => {
    const older = rec('ME', '2026-01-01', { provisional: true })
    const newer = rec('ME', '2026-02-01', { provisional: true })
    expect(pickReferences([older, newer]).get('ME')).toBe(newer)
  })

  it('takes the newest when neither is provisional and both sample alike', () => {
    const older = rec('ME', '2026-01-01')
    const newer = rec('ME', '2026-02-01')
    expect(pickReferences([older, newer]).get('ME')).toBe(newer)
  })

  it('prefers finer temporal sampling over mere recency', () => {
    // Same sign, same length: 25 fps vs 10 fps. The coarser one was converted
    // later, so "newest wins" alone would pick the worse reference.
    const detailed = rec('ME', '2026-01-01', { durationMs: 2000, frameCount: 50 })
    const coarse = rec('ME', '2026-06-01', { durationMs: 2000, frameCount: 20 })
    expect(pickReferences([coarse, detailed]).get('ME')).toBe(detailed)
  })

  it('still lets a provisional recording lose to a coarser authoritative one', () => {
    const provisionalHighRate = rec('ME', '2026-06-01', {
      provisional: true,
      durationMs: 2000,
      frameCount: 60,
    })
    const authoritativeLowRate = rec('ME', '2026-01-01', { durationMs: 2000, frameCount: 20 })
    expect(pickReferences([provisionalHighRate, authoritativeLowRate]).get('ME')).toBe(
      authoritativeLowRate,
    )
  })

  it('keeps one entry per gloss', () => {
    const picked = pickReferences([rec('ME', '2026-01-01'), rec('YOU', '2026-01-01')])
    expect([...picked.keys()].sort()).toEqual(['ME', 'YOU'])
  })

  it('ranks a locally-recorded sign against the index on the same footing', () => {
    // A learner's own recording arrives as a full SignRecording from IndexedDB
    // and has to compete with frameless index entries. toMeta is what puts them
    // on the same footing; if it dropped frameCount, capture rate would read 0
    // and a fine-sampled local recording would lose for the wrong reason.
    const frames = Array.from({ length: 50 }, (_, i) => ({ timestampMs: i * 40, hands: [] }))
    const local: SignRecording = {
      id: 'local-1',
      gloss: 'ME',
      signer: 'kavindu',
      createdAt: '2026-01-01',
      durationMs: 2000,
      fps: 25,
      videoWidth: 1280,
      videoHeight: 720,
      frames,
    }
    const coarseBundled = rec('ME', '2026-06-01', { durationMs: 2000, frameCount: 20 })
    const localMeta = toMeta(local)

    expect(localMeta.frameCount).toBe(50)
    expect(pickReferences([coarseBundled, localMeta]).get('ME')).toBe(localMeta)
  })
})
