import type { TrackedHand } from './types'

export const HAND_COLORS: Record<string, string> = {
  // Must match --hand-left / --hand-right in src/index.css (Suvana teal-400
  // and lime-400) — this file is the source of truth for the canvas.
  Left: '#2dd4bf',
  Right: '#a3e635',
}
const FALLBACK_COLOR = '#f472b6'

const JOINT_OUTLINE = '#0f172a'

/**
 * Stroke and joint size as a fraction of the frame's width, not in absolute
 * pixels.
 *
 * This matters because the corpora disagree on frame size: the Kaggle clips are
 * 1280×720 or 960×540 while Yohan's are 512×512. A fixed 5 px stroke is 0.39%
 * of a Kaggle frame and 0.98% of a Yohan one, so the same code drew a fine
 * skeleton for one corpus and fat blobs that swallowed the hand shape for the
 * other — on the very artifact a learner is trying to read.
 *
 * Scaling by frame width makes every recording render at the same apparent
 * weight once it is scaled to its display size, whatever it was captured at.
 */
const BONE_FRACTION = 0.0045
/* Joints are deliberately thinner than bones. They only mark landmark
   positions, whereas the bones carry the handshape — and on a clenched hand all
   21 landmarks crowd into a small area, where fat dots merge into a blob and
   hide the very thing the learner is trying to read. */
const JOINT_FRACTION = 0.0028
const MIN_PX = 1.2

/** Palm quad, wrist round to the little-finger knuckle. */
const PALM = [0, 5, 9, 13, 17] as const

/**
 * MediaPipe's hand skeleton topology, inlined from
 * `HandLandmarker.HAND_CONNECTIONS`. Kept here so that drawing a skeleton does
 * not pull in @mediapipe/tasks-vision: importing it for this alone cost 135 KB
 * (40 KB gzip) in the initial bundle, because the reference preview renders on
 * first paint even for a learner who never starts the camera.
 *
 * drawing.test.ts asserts this stays identical to MediaPipe's own list, so an
 * upstream change cannot silently desync it.
 */
export const HAND_CONNECTIONS: readonly (readonly [number, number])[] = [
  [0, 1], [1, 2], [2, 3], [3, 4], // thumb
  [0, 5], [5, 6], [6, 7], [7, 8], // index
  [5, 9], [9, 10], [10, 11], [11, 12], // middle
  [9, 13], [13, 14], [14, 15], [15, 16], // ring
  [13, 17], [0, 17], [17, 18], [18, 19], [19, 20], // little + palm edge
]

/**
 * Maps normalised landmarks into the canvas, replacing raw framing.
 *
 * Computed once for a whole recording (see fitFor) rather than per frame, so
 * the hand's motion through the clip survives — only where the signer happened
 * to stand relative to the camera is removed.
 */
export interface Fit {
  cx: number
  cy: number
  k: number
}

const IDENTITY: Fit = { cx: 0.5, cy: 0.5, k: 1 }

/**
 * A fit that centres a recording's whole trajectory and zooms it to fill the
 * frame, so two clips can be compared without their camera framing getting in
 * the way. Returns the identity fit when there is nothing to measure.
 */
export function fitFor(frames: { hands: TrackedHand[] }[], padding = 0.82): Fit {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const f of frames) {
    for (const h of f.hands) {
      for (const p of h.landmarks) {
        if (p.x < minX) minX = p.x
        if (p.x > maxX) maxX = p.x
        if (p.y < minY) minY = p.y
        if (p.y > maxY) maxY = p.y
      }
    }
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY)) return IDENTITY
  const spanX = Math.max(maxX - minX, 1e-3)
  const spanY = Math.max(maxY - minY, 1e-3)
  return {
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    // Never zoom past 3x: a nearly-still hand would otherwise fill the frame
    // and turn small tracking jitter into large apparent movement.
    k: Math.min(padding / spanX, padding / spanY, 3),
  }
}

/**
 * Draws hand skeletons onto a canvas. Used by both the live camera overlay and
 * recording replay, so a learner compares like with like.
 *
 * Beyond the bare wireframe this adds two depth cues, because a flat stick
 * figure cannot tell you which way a hand is facing — and orientation is part
 * of the sign, not decoration:
 *
 *  - a translucent palm, which reads as a surface rather than four loose lines
 *    and makes a rotating hand legible;
 *  - joints sized by their z depth, so fingers toward the camera are larger
 *    than fingers behind the palm.
 *
 * Both are *visual* cues drawn straight from the landmarks. Nothing here
 * asserts in words which way a palm faces: that would be a claim about the
 * sign, and landmark z is far too noisy to make one.
 */
export function drawHands(
  ctx: CanvasRenderingContext2D,
  hands: TrackedHand[],
  fit: Fit = IDENTITY,
  /**
   * Force every hand to one colour instead of the left/right pair. The
   * reference player passes this: there the skeleton is a teaching diagram and
   * a colour that changes with which hand the signer used is just noise. In
   * the live self-view the colour *is* information, so it is left unset.
   */
  colorOverride?: string,
) {
  const { width, height } = ctx.canvas
  const px = (p: { x: number }) => ((p.x - fit.cx) * fit.k + 0.5) * width
  const py = (p: { y: number }) => ((p.y - fit.cy) * fit.k + 0.5) * height
  const bone = Math.max(MIN_PX, width * BONE_FRACTION)
  const joint = Math.max(MIN_PX, width * JOINT_FRACTION)

  for (const hand of hands) {
    const color = colorOverride ?? HAND_COLORS[hand.handedness] ?? FALLBACK_COLOR
    const pts = hand.landmarks
    if (pts.length === 0) continue

    // Palm first, so the bones and joints sit on top of it.
    const palm = PALM.map((i) => pts[i]).filter(Boolean)
    if (palm.length === PALM.length) {
      ctx.beginPath()
      ctx.moveTo(px(palm[0]), py(palm[0]))
      for (const p of palm.slice(1)) ctx.lineTo(px(p), py(p))
      ctx.closePath()
      ctx.globalAlpha = 0.16
      ctx.fillStyle = color
      ctx.fill()
      ctx.globalAlpha = 1
    }

    // Each bone and each joint is stroked on its own rather than batched into
    // one Path2D per hand. Measured both ways: batching composites overlapping
    // antialiased edges once instead of once per shape, changing 27% of the
    // inked pixels, and is also *slower* here (0.022 ms vs 0.017 ms per frame)
    // because Path2D setup costs more than the draw calls it saves on paths
    // this small.
    ctx.strokeStyle = color
    ctx.lineWidth = bone
    for (const [from, to] of HAND_CONNECTIONS) {
      const a = pts[from]
      const b = pts[to]
      if (!a || !b) continue
      ctx.beginPath()
      ctx.moveTo(px(a), py(a))
      ctx.lineTo(px(b), py(b))
      ctx.stroke()
    }

    // z is depth relative to the wrist, negative toward the camera. Normalising
    // per hand rather than against a fixed range keeps the cue readable whether
    // the hand is flat on or edge on, where the absolute spread differs a lot.
    let zMin = Infinity
    let zMax = -Infinity
    for (const p of pts) {
      if (p.z < zMin) zMin = p.z
      if (p.z > zMax) zMax = p.z
    }
    const zSpan = Math.max(zMax - zMin, 1e-4)

    ctx.fillStyle = color
    ctx.strokeStyle = JOINT_OUTLINE
    ctx.lineWidth = Math.max(1, bone * 0.2)
    for (const p of pts) {
      // 1 nearest, 0 furthest → radius spans 0.8×–1.2× of the base. Kept
      // narrow for the same reason the joints are small: on a closed hand a
      // wider range just makes the cluster messier.
      const nearness = 1 - (p.z - zMin) / zSpan
      ctx.beginPath()
      ctx.arc(px(p), py(p), joint * (0.8 + 0.4 * nearness), 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    }
  }
}
