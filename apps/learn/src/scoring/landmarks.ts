// MediaPipe hand landmark indices and their grouping into fingers.
// https://developers.google.com/mediapipe/solutions/vision/hand_landmarker

export const NUM_LANDMARKS = 21
export const WRIST = 0
export const MIDDLE_FINGER_MCP = 9 // stable point used to measure hand size

export type Finger = 'wrist' | 'thumb' | 'index' | 'middle' | 'ring' | 'pinky'

/** Which finger each of the 21 landmarks belongs to. */
export const LANDMARK_FINGER: Finger[] = [
  'wrist', // 0
  'thumb', 'thumb', 'thumb', 'thumb', // 1-4
  'index', 'index', 'index', 'index', // 5-8
  'middle', 'middle', 'middle', 'middle', // 9-12
  'ring', 'ring', 'ring', 'ring', // 13-16
  'pinky', 'pinky', 'pinky', 'pinky', // 17-20
]

/** Human-friendly finger names for corrective feedback text. */
export const FINGER_LABEL: Record<Finger, string> = {
  wrist: 'wrist',
  thumb: 'thumb',
  index: 'index finger',
  middle: 'middle finger',
  ring: 'ring finger',
  pinky: 'little finger',
}
