// Type-only: erased at build, so it creates no bundle edge. The library itself
// is imported dynamically in createHandLandmarker below, which keeps ~135 KB
// off the initial chunk — a learner who never starts the camera never pays it.
import type { HandLandmarker } from '@mediapipe/tasks-vision'

// Both the WASM runtime and the model are served from our own origin
// (scripts/copy-wasm.mjs fills public/wasm on install; the model lives in
// public/models/), so practice sessions never depend on CDN availability.
// BASE_URL-relative, not root-absolute: this module is served under /learn/ on
// the Suvana domain, and Vite's `base` does not rewrite string literals.
// BASE_URL always ends in a slash.
const WASM_DIR = `${import.meta.env.BASE_URL}wasm`
const MODEL_PATH = `${import.meta.env.BASE_URL}models/hand_landmarker.task`

let cached: Promise<HandLandmarker> | null = null

/**
 * Shared landmarker instance. Loading the WASM runtime + model takes ~1 s,
 * so all views reuse one tracker instead of re-creating it per mount.
 * Timestamps passed to detectForVideo use performance.now(), which stays
 * monotonic across views, as MediaPipe's VIDEO mode requires.
 */
export function getHandLandmarker(): Promise<HandLandmarker> {
  if (!cached) {
    cached = createHandLandmarker().catch((e) => {
      cached = null // allow a retry after a failed load
      throw e
    })
  }
  return cached
}

async function createHandLandmarker(): Promise<HandLandmarker> {
  const { FilesetResolver, HandLandmarker } = await import('@mediapipe/tasks-vision')
  const fileset = await FilesetResolver.forVisionTasks(WASM_DIR)
  return HandLandmarker.createFromOptions(fileset, {
    baseOptions: {
      modelAssetPath: MODEL_PATH,
      // GPU when WebGL is available; MediaPipe falls back to CPU otherwise.
      delegate: 'GPU',
    },
    runningMode: 'VIDEO',
    numHands: 2,
    minHandDetectionConfidence: 0.5,
    minHandPresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  })
}
