/**
 * SoundGuard — Adaptive detection gate
 * ─────────────────────────────────────────────────────────────────────────────
 * Decides whether a 3-second window contains anything worth running the CNN on.
 *
 * Pure and dependency-free so it can be exercised directly in a test harness —
 * this is the logic standing between the user and a false alarm, and it is not
 * something to verify by ear on a phone.
 *
 * ── The design ───────────────────────────────────────────────────────────────
 *
 * The previous gate was an absolute RMS threshold. Microphone gain varies by an
 * order of magnitude across Android devices, so one fixed number is
 * simultaneously too high on a quiet handset and far too low on a loud one. On
 * a device whose idle noise sat above the threshold, every sensitivity level
 * passed every window — which is why the slider appeared to do nothing at all.
 *
 * Instead the gate is relative to a noise floor learned from the room:
 *
 *   level  the loudest 125 ms block, so a short transient is not diluted by
 *          three seconds of quiet around it
 *   floor  the same statistic, tracked slowly across windows
 *   open   level − floor >= triggerDb, and level >= absMinLevel
 *
 * Measuring level and floor with the *same* statistic matters. Comparing a peak
 * against a floor built from medians biases every reading up by the room's
 * natural peak-to-median ratio (3–6 dB), which at high sensitivity sits close
 * enough to the trigger to fire on ambience alone.
 *
 * Two safeguards:
 *   • the floor sample is clamped to `median × 4`, so a single loud spike in an
 *     otherwise quiet window cannot drag the floor up with it;
 *   • the floor only adapts on windows that FAIL the gate, so a sustained siren
 *     can never gradually train the engine to ignore it.
 */

/** Level-analysis block length in seconds. */
export const GATE_BLOCK_SECONDS = 0.125;

/** Windows spent learning the room before any classification is attempted. */
export const CALIBRATION_WINDOWS = 3;

const FLOOR_DECAY_DOWN = 0.3;
const FLOOR_DECAY_UP = 0.05;
const FLOOR_DECAY_CALIBRATION = 0.6;
const FLOOR_MIN = 1e-5;
const FLOOR_MAX = 0.2;
const DB_EPSILON = 1e-7;

export function toDb(amplitude: number): number {
  return 20 * Math.log10(Math.max(amplitude, DB_EPSILON));
}

export type GateProfile = {
  /** Required margin of the loudest block over the learned floor, in dB. */
  triggerDb: number;
  /** Absolute block-RMS floor, so a silent room cannot trigger on its own. */
  absMinLevel: number;
};

export type GateState = {
  /** Learned ambient level, linear RMS. Negative until the first window. */
  noiseFloor: number;
  calibrationLeft: number;
};

export type GateResult = {
  open: boolean;
  /** Loudest block, dBFS. */
  levelDb: number;
  /** Learned floor, dBFS. */
  floorDb: number;
  /** True while still learning the room. */
  calibrating: boolean;
};

export function createGateState(): GateState {
  return { noiseFloor: -1, calibrationLeft: CALIBRATION_WINDOWS };
}

export function resetGateState(state: GateState): void {
  state.noiseFloor = -1;
  state.calibrationLeft = CALIBRATION_WINDOWS;
}

/** Median of the first `count` entries. `scratch` is used as sort space. */
function medianOf(values: Float32Array, count: number, scratch: Float32Array): number {
  if (count <= 0) return 0;
  for (let i = 0; i < count; i++) scratch[i] = values[i] as number;
  const view = scratch.subarray(0, count);
  view.sort();
  const mid = count >> 1;
  return count % 2 === 1
    ? (view[mid] as number)
    : ((view[mid - 1] as number) + (view[mid] as number)) / 2;
}

function clampFloor(value: number): number {
  return Math.min(FLOOR_MAX, Math.max(FLOOR_MIN, value));
}

/**
 * Evaluate one window. `state` is mutated in place.
 *
 * @param blockRms Per-block RMS values for this window.
 * @param blocks   How many entries of `blockRms` are valid.
 * @param scratch  Scratch array at least `blocks` long.
 */
export function evaluateGate(
  blockRms: Float32Array,
  blocks: number,
  scratch: Float32Array,
  profile: GateProfile,
  state: GateState,
): GateResult {
  let peak = 0;
  for (let i = 0; i < blocks; i++) {
    const v = blockRms[i] as number;
    if (v > peak) peak = v;
  }
  const median = medianOf(blockRms, blocks, scratch);

  // Like-for-like with `peak`, but spike-resistant.
  const floorSample = Math.min(peak, median * 4);

  if (state.noiseFloor < 0) state.noiseFloor = clampFloor(floorSample);

  const levelDb = toDb(peak);

  if (state.calibrationLeft > 0) {
    state.calibrationLeft -= 1;
    state.noiseFloor = clampFloor(
      state.noiseFloor + FLOOR_DECAY_CALIBRATION * (floorSample - state.noiseFloor),
    );
    return {
      open: false,
      levelDb,
      floorDb: toDb(state.noiseFloor),
      calibrating: state.calibrationLeft > 0,
    };
  }

  const floorDb = toDb(state.noiseFloor);
  const open = peak >= profile.absMinLevel && levelDb - floorDb >= profile.triggerDb;

  if (!open) {
    const rate = floorSample < state.noiseFloor ? FLOOR_DECAY_DOWN : FLOOR_DECAY_UP;
    state.noiseFloor = clampFloor(state.noiseFloor + rate * (floorSample - state.noiseFloor));
  }

  return { open, levelDb, floorDb, calibrating: false };
}
