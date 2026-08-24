import type { HandFrame, TrackedHand } from '../vision/types'
import { MIDDLE_FINGER_MCP, NUM_LANDMARKS, WRIST } from './landmarks'

/**
 * Per-frame features for one hand, split into two blocks:
 *  - `shape`: the 21 landmarks made relative to the wrist and divided by hand
 *    size, so it captures handshape + orientation independent of where the
 *    hand is in frame or how far it is from the camera. Length 21*3 = 63.
 *  - `traj`: the wrist position, centred on the sequence's mean wrist position
 *    and divided by hand size, so it captures the path the hand travels.
 *    Length 3.
 *
 * Frame-to-frame velocity was tried here and rejected. It separates signs
 * better (75.5% vs 73.5%, weight-fit-report.md) because absolute position
 * carries where the signer happened to stand, which is noise — but per-frame
 * velocity differences are small next to hand size, so a learner moving the
 * hand in entirely the wrong direction still scored 100. Catching that is the
 * point of the block, so centred position stays.
 *
 * Splitting them lets the comparison weight "did you make the right shape"
 * separately from "did you move it the right way", and drives per-joint
 * feedback from the shape block.
 */
export interface FrameFeature {
  shape: number[]
  traj: number[]
}

export interface HandFeatureSequence {
  handedness: 'Left' | 'Right'
  frames: FrameFeature[]
}

interface Vec3 {
  x: number
  y: number
  z: number
}

/**
 * MediaPipe x is normalised by image width and y by image height, so on a
 * 16:9 frame equal pixel distances are unequal in normalised units. Rescale x
 * (and the width-scaled z) by the aspect ratio to get an isotropic space
 * before we measure any distances.
 */
function correct(p: Vec3, aspect: number): Vec3 {
  return { x: p.x * aspect, y: p.y, z: p.z * aspect }
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }
}

function norm(v: Vec3): number {
  return Math.hypot(v.x, v.y, v.z)
}

/** Hand size = wrist→middle-finger-MCP distance, in the corrected space. */
function handScale(hand: TrackedHand, aspect: number): number {
  const wrist = correct(hand.landmarks[WRIST], aspect)
  const mid = correct(hand.landmarks[MIDDLE_FINGER_MCP], aspect)
  return norm(sub(mid, wrist))
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function findHand(frame: HandFrame, handedness: 'Left' | 'Right'): TrackedHand | undefined {
  return frame.hands.find((h) => h.handedness === handedness)
}

/**
 * Reflect a hand sequence left↔right. Because the feature space is linear in
 * the (aspect-corrected) image x axis, mirroring the image is exactly negating
 * the x component of both blocks — and it swaps which hand you're looking at.
 *
 * Sign languages let the signer choose their dominant hand, so a left-dominant
 * learner performs a right-handed reference mirrored. Scoring both orientations
 * (see score.ts) is what keeps that from reading as a total miss.
 */
export function mirrorHandFeatures(seq: HandFeatureSequence): HandFeatureSequence {
  return {
    handedness: seq.handedness === 'Left' ? 'Right' : 'Left',
    frames: seq.frames.map((f) => ({
      shape: f.shape.map((v, i) => (i % 3 === 0 ? -v : v)),
      traj: [-f.traj[0], f.traj[1], f.traj[2]],
    })),
  }
}

/** Distinct handednesses that appear anywhere in the recording. */
export function handednessesIn(frames: HandFrame[]): Array<'Left' | 'Right'> {
  const seen = new Set<'Left' | 'Right'>()
  for (const f of frames) for (const h of f.hands) seen.add(h.handedness)
  return [...seen]
}

/**
 * Build the feature sequence for one hand across a recording. Only frames
 * where that hand is tracked contribute; the resulting sequence may be
 * shorter than the recording (DTW tolerates differing lengths).
 */
export function extractHandFeatures(
  frames: HandFrame[],
  handedness: 'Left' | 'Right',
  videoWidth: number,
  videoHeight: number,
): HandFeatureSequence {
  const aspect = videoHeight > 0 ? videoWidth / videoHeight : 1

  const present: TrackedHand[] = []
  for (const frame of frames) {
    const hand = findHand(frame, handedness)
    if (hand && hand.landmarks.length >= NUM_LANDMARKS) present.push(hand)
  }

  // Sequence-level constants for the trajectory block: a stable hand size and
  // the mean wrist position to centre the path on.
  const scales = present.map((h) => handScale(h, aspect)).filter((s) => s > 1e-6)
  const seqScale = median(scales) || 1
  const wrists = present.map((h) => correct(h.landmarks[WRIST], aspect))
  const centroid = wrists.reduce(
    (acc, w) => ({
      x: acc.x + w.x / wrists.length,
      y: acc.y + w.y / wrists.length,
      z: acc.z + w.z / wrists.length,
    }),
    { x: 0, y: 0, z: 0 },
  )

  const featureFrames: FrameFeature[] = present.map((hand) => {
    const wrist = correct(hand.landmarks[WRIST], aspect)
    const frameScale = handScale(hand, aspect) || seqScale

    const shape: number[] = []
    for (let i = 0; i < NUM_LANDMARKS; i++) {
      const p = sub(correct(hand.landmarks[i], aspect), wrist)
      shape.push(p.x / frameScale, p.y / frameScale, p.z / frameScale)
    }

    const traj = [
      (wrist.x - centroid.x) / seqScale,
      (wrist.y - centroid.y) / seqScale,
      (wrist.z - centroid.z) / seqScale,
    ]

    return { shape, traj }
  })

  return { handedness, frames: featureFrames }
}
