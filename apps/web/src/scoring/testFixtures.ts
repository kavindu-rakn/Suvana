// Synthetic recording builders for the scoring tests. Not shipped — these are
// only imported by *.test.ts files.
import type { HandFrame, Landmark, SignRecording, TrackedHand } from '../vision/types'

/**
 * A canonical open-hand pose: 21 landmarks as offsets from the wrist (at
 * origin), five fingers fanned out. Deterministic so tests are stable.
 */
export function canonicalHand(): Landmark[] {
  const pts: Landmark[] = [{ x: 0, y: 0, z: 0 }] // wrist
  for (let f = 0; f < 5; f++) {
    const ang = ((-60 + f * 30) * Math.PI) / 180
    for (let j = 1; j <= 4; j++) {
      pts.push({ x: Math.sin(ang) * 0.03 * j, y: -Math.cos(ang) * 0.035 * j, z: 0 })
    }
  }
  return pts // 21 points
}

/** The same hand with every finger offset rotated 90° in the x/y plane. */
export function rotatedHand(): Landmark[] {
  return canonicalHand().map(({ x, y, z }) => ({ x: -y, y: x, z }))
}

type Vec = { x: number; y: number }

interface BuildOpts {
  gloss?: string
  frameCount?: number
  durationMs?: number
  /** Wrist position over time, param t in [0,1] → normalised image point. */
  wristPath?: (t: number) => Vec
  pose?: Landmark[]
  /** Multiplies the pose offsets (camera-distance / hand-size changes). */
  scale?: number
  handedness?: 'Left' | 'Right'
  videoWidth?: number
  videoHeight?: number
}

/** Build a single-hand recording by placing `pose` at each point of `wristPath`. */
export function buildRecording(opts: BuildOpts = {}): SignRecording {
  const {
    gloss = 'TEST',
    frameCount = 40,
    durationMs = 2000,
    wristPath = (t) => ({ x: 0.4 + 0.2 * t, y: 0.5 }),
    pose = canonicalHand(),
    scale = 1,
    handedness = 'Right',
    videoWidth = 1280,
    videoHeight = 720,
  } = opts

  // The pose and wrist path are authored in "square" units (width measured in
  // frame-heights). We project them to MediaPipe-style normalised coordinates
  // by dividing x (and the width-scaled z) by the aspect ratio — i.e. we model
  // a real camera. This is the inverse of the code's aspect correction, so the
  // same authored motion captured at different resolutions must score ~100.
  const aspect = videoWidth > 0 && videoHeight > 0 ? videoWidth / videoHeight : 1

  const frames: HandFrame[] = []
  for (let i = 0; i < frameCount; i++) {
    const t = frameCount > 1 ? i / (frameCount - 1) : 0
    const w = wristPath(t)
    const landmarks: Landmark[] = pose.map((p) => ({
      x: (w.x + p.x * scale) / aspect,
      y: w.y + p.y * scale,
      z: (p.z * scale) / aspect,
    }))
    const hand: TrackedHand = { handedness, score: 0.99, landmarks }
    frames.push({ timestampMs: Math.round(t * durationMs), hands: [hand] })
  }

  return {
    id: `${gloss}-${Math.random().toString(36).slice(2)}`,
    gloss,
    signer: 'synthetic',
    createdAt: new Date().toISOString(),
    durationMs,
    fps: Math.round((frameCount / durationMs) * 1000),
    videoWidth,
    videoHeight,
    frames,
  }
}

/** Translate every landmark of a recording by a constant offset. */
export function translate(rec: SignRecording, dx: number, dy: number): SignRecording {
  return {
    ...rec,
    id: rec.id + '-t',
    frames: rec.frames.map((f) => ({
      ...f,
      hands: f.hands.map((h) => ({
        ...h,
        landmarks: h.landmarks.map((l) => ({ x: l.x + dx, y: l.y + dy, z: l.z })),
      })),
    })),
  }
}

/**
 * Scale every landmark about a centre point — models moving closer to / further
 * from the camera, which enlarges the handshape AND the movement amplitude
 * together (unlike the `scale` build option, which only enlarges the hand).
 */
export function zoom(rec: SignRecording, factor: number, cx = 0.5, cy = 0.5): SignRecording {
  return {
    ...rec,
    id: rec.id + '-z',
    frames: rec.frames.map((f) => ({
      ...f,
      hands: f.hands.map((h) => ({
        ...h,
        landmarks: h.landmarks.map((l) => ({
          x: cx + (l.x - cx) * factor,
          y: cy + (l.y - cy) * factor,
          z: l.z * factor,
        })),
      })),
    })),
  }
}

/**
 * Reflect the recording left↔right — what a left-dominant learner produces when
 * imitating a right-handed reference. MediaPipe reports the flipped handedness.
 */
export function mirrorRecording(rec: SignRecording): SignRecording {
  return {
    ...rec,
    id: rec.id + '-m',
    frames: rec.frames.map((f) => ({
      ...f,
      hands: f.hands.map((h) => ({
        ...h,
        handedness: h.handedness === 'Left' ? ('Right' as const) : ('Left' as const),
        landmarks: h.landmarks.map((l) => ({ x: 1 - l.x, y: l.y, z: l.z })),
      })),
    })),
  }
}

/** Strip all hands — models an attempt where tracking never caught a hand. */
export function withoutHands(rec: SignRecording): SignRecording {
  return { ...rec, id: rec.id + '-e', frames: rec.frames.map((f) => ({ ...f, hands: [] })) }
}

/** Duplicate every frame — a crude "signed at half speed" time warp. */
export function timeWarp(rec: SignRecording): SignRecording {
  const frames: HandFrame[] = []
  rec.frames.forEach((f) => {
    frames.push(f, f)
  })
  return { ...rec, id: rec.id + '-w', frames }
}
