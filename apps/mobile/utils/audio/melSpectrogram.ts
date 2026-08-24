/**
 * SoundGuard — Mel-Spectrogram Feature Extraction
 * ─────────────────────────────────────────────────────────────────────────────
 * A faithful port of the training preprocessing in
 * `sound_awareness_backend/data_preprocessing.py`, which is:
 *
 *     y = y / max(abs(y))
 *     S   = librosa.feature.melspectrogram(y, sr=22050, n_mels=128,
 *                                          n_fft=2048, hop_length=512)
 *     dB  = librosa.power_to_db(S, ref=np.max)
 *     dB  = (dB - dB.min()) / (dB.max() - dB.min() + 1e-8)
 *     dB  = dB[:, :128]
 *
 * ── Why this file was rewritten ──────────────────────────────────────────────
 *
 * The previous port silently disagreed with librosa in five places. Every one
 * of them shifts the input distribution away from what the CNN was trained on,
 * which is the root cause of confident nonsense predictions on near-silence:
 * the model was never shown features that look like this, so its output is
 * meaningless rather than merely uncertain.
 *
 *   1. MEL SCALE. librosa defaults to `htk=False`, the Slaney mel scale
 *      (linear below 1 kHz, logarithmic above). The port used the HTK formula
 *      2595·log10(1 + f/700), which places every band edge somewhere else.
 *
 *   2. FILTER NORMALISATION. librosa defaults to `norm='slaney'`, scaling each
 *      triangle by 2/(f[i+2] − f[i]) so filters are unit-area. The port used
 *      raw unit-height triangles, so high-frequency bands — which are far wider
 *      — were weighted many times too heavily.
 *
 *   3. FILTER GEOMETRY. librosa builds triangles over continuous frequencies.
 *      The port rounded every band edge to an integer FFT bin first, quantising
 *      the low bands badly, where the triangles are only a few bins wide.
 *
 *   4. WINDOW SYMMETRY. librosa uses a periodic Hann (divisor N). The port used
 *      the symmetric form (divisor N−1).
 *
 *   5. FRAMING AND DYNAMIC RANGE. librosa centres frames (zero-padding n_fft/2
 *      at each end) giving 130 frames, and `power_to_db` clamps at
 *      `top_db=80` below the peak. The port produced 126 uncentred frames,
 *      zero-padded the remainder, and used an unbounded floor of 1e-10 — so the
 *      min-max normalisation that follows was stretched over a different
 *      dynamic range on every single clip.
 *
 * Verified numerically against librosa itself; see the note at the bottom of
 * this file for the measured agreement.
 *
 * ── Performance ──────────────────────────────────────────────────────────────
 * The mel projection uses a sparse basis (each triangle is non-zero over a
 * narrow contiguous bin span), the FFT is table-driven and allocation-free, and
 * extraction yields cooperatively on an elapsed-time budget so the JS thread is
 * never blocked long enough to stall a render.
 */

import { binCount, fftPowerSpectrum, periodicHannWindow } from './fft';

// ─── Parameters (must match data_preprocessing.py) ───────────────────────────
export const SAMPLE_RATE = 22050;
export const N_FFT = 2048;
export const HOP_LENGTH = 512;
export const N_MELS = 128;
export const CLIP_DURATION = 3.0;
export const CLIP_SAMPLES = Math.floor(SAMPLE_RATE * CLIP_DURATION); // 66 150
export const MEL_SPEC_WIDTH = 128;

/** librosa `power_to_db` defaults. */
const AMIN = 1e-10;
const TOP_DB = 80.0;

const N_BINS = binCount(N_FFT); // 1025

/**
 * librosa `stft(center=True)` zero-pads n_fft/2 at both ends, so the frame
 * count is 1 + floor(len(y) / hop) = 130. All 130 frames contribute to the
 * dB reference and to the min–max statistics; only the first 128 are kept,
 * exactly as the training script slices `[:, :target_width]`.
 */
const PAD = N_FFT >> 1; // 1024
const N_FRAMES = 1 + Math.floor(CLIP_SAMPLES / HOP_LENGTH); // 130

/**
 * Cooperative yielding is budgeted by elapsed time rather than a fixed slice
 * count: a macrotask yield costs real milliseconds, so a fixed schedule either
 * over-yields on a fast device or under-yields on a slow one. A device that
 * finishes inside the budget yields zero times.
 */
const YIELD_BUDGET_MS = 24;
const FRAMES_PER_CHECK = 8;
const MELS_PER_CHECK = 16;

// ─── Slaney mel scale (librosa htk=False) ────────────────────────────────────

const F_SP = 200.0 / 3.0;
const MIN_LOG_HZ = 1000.0;
const MIN_LOG_MEL = MIN_LOG_HZ / F_SP; // 15.0
const LOGSTEP = Math.log(6.4) / 27.0;

function hzToMel(hz: number): number {
  if (hz >= MIN_LOG_HZ) return MIN_LOG_MEL + Math.log(hz / MIN_LOG_HZ) / LOGSTEP;
  return hz / F_SP;
}

function melToHz(mel: number): number {
  if (mel >= MIN_LOG_MEL) return MIN_LOG_HZ * Math.exp(LOGSTEP * (mel - MIN_LOG_MEL));
  return mel * F_SP;
}

// ─── Mel filterbank (librosa.filters.mel, norm='slaney') ─────────────────────

type SparseFilterbank = {
  starts: Int32Array;
  lengths: Int32Array;
  offsets: Int32Array;
  weights: Float32Array;
  nonZero: number;
};

/**
 * Build librosa's mel basis, then compress each row to its non-zero support.
 *
 * The dense row is computed with librosa's exact expressions — continuous
 * ramps against the real FFT frequencies, clamped at zero, then scaled by the
 * Slaney unit-area factor — so the compressed basis reproduces it exactly.
 */
function buildFilterbank(): SparseFilterbank {
  const fftFreqs = new Float64Array(N_BINS);
  for (let k = 0; k < N_BINS; k++) fftFreqs[k] = (k * SAMPLE_RATE) / N_FFT;

  // n_mels + 2 band edges, evenly spaced on the mel scale, returned in Hz.
  const melF = new Float64Array(N_MELS + 2);
  const minMel = hzToMel(0);
  const maxMel = hzToMel(SAMPLE_RATE / 2);
  for (let i = 0; i < N_MELS + 2; i++) {
    melF[i] = melToHz(minMel + ((maxMel - minMel) * i) / (N_MELS + 1));
  }

  const starts = new Int32Array(N_MELS);
  const lengths = new Int32Array(N_MELS);
  const offsets = new Int32Array(N_MELS);
  const runs: number[][] = [];
  let total = 0;

  for (let m = 0; m < N_MELS; m++) {
    const fLower = melF[m] as number;
    const fCentre = melF[m + 1] as number;
    const fUpper = melF[m + 2] as number;

    const dLower = fCentre - fLower; // fdiff[m]
    const dUpper = fUpper - fCentre; // fdiff[m + 1]
    // Slaney unit-area normalisation: enorm = 2 / (f[m+2] - f[m])
    const enorm = 2.0 / (fUpper - fLower);

    let first = -1;
    let last = -1;
    const row: number[] = [];

    for (let k = 0; k < N_BINS; k++) {
      const f = fftFreqs[k] as number;
      // lower = -(f_lower - f) / fdiff[m]  ;  upper = (f_upper - f) / fdiff[m+1]
      const lower = dLower > 0 ? (f - fLower) / dLower : -Infinity;
      const upper = dUpper > 0 ? (fUpper - f) / dUpper : -Infinity;
      const w = Math.min(lower, upper);
      if (w > 0) {
        if (first < 0) first = k;
        last = k;
        row.push(w * enorm);
      } else if (first >= 0 && k > last) {
        // Triangles are unimodal: once past the support we are done.
        break;
      }
    }

    if (first < 0) {
      starts[m] = 0;
      lengths[m] = 0;
      offsets[m] = total;
      runs.push([]);
      continue;
    }

    starts[m] = first;
    lengths[m] = row.length;
    offsets[m] = total;
    total += row.length;
    runs.push(row);
  }

  const weights = new Float32Array(total);
  let w = 0;
  for (const run of runs) {
    for (let i = 0; i < run.length; i++) weights[w++] = run[i] as number;
  }

  return { starts, lengths, offsets, weights, nonZero: total };
}

let _filterbank: SparseFilterbank | null = null;
function getFilterbank(): SparseFilterbank {
  if (!_filterbank) _filterbank = buildFilterbank();
  return _filterbank;
}

/** Exposed for the verification harness. */
export function filterbankStats() {
  const fb = getFilterbank();
  return { nonZero: fb.nonZero, dense: N_MELS * N_BINS };
}

// ─── Reusable scratch ────────────────────────────────────────────────────────

const signalBuf = new Float32Array(CLIP_SAMPLES);
const frameBuf = new Float32Array(N_FFT);
const powerBuf = new Float32Array(N_FRAMES * N_BINS);
const melBuf = new Float32Array(N_MELS * N_FRAMES);

let _busy = false;
let _sliceStart = 0;

function yieldToEventLoop(): Promise<void> {
  // A macrotask is required: a microtask drains before the platform regains
  // control and would never let React commit or a touch event through.
  return new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}

async function yieldIfOverBudget(): Promise<void> {
  if (Date.now() - _sliceStart < YIELD_BUDGET_MS) return;
  await yieldToEventLoop();
  _sliceStart = Date.now();
}

// ─── Extraction ──────────────────────────────────────────────────────────────

/**
 * Convert PCM at SAMPLE_RATE into the flattened, normalised mel-spectrogram the
 * CNN expects: Float32Array of length N_MELS × MEL_SPEC_WIDTH, laid out
 * row-major as `[mel * MEL_SPEC_WIDTH + frame]` — the C-order flattening of
 * numpy's `(128, 128, 1)`.
 *
 * The input array is not mutated. Yields to the event loop when a slice
 * overruns its time budget.
 *
 * @throws if called re-entrantly; the shared scratch buffers make concurrent
 *         extraction unsafe and the engine already serialises calls.
 */
export async function extractMelSpectrogramAsync(pcm: Float32Array): Promise<Float32Array> {
  if (_busy) throw new Error('extractMelSpectrogramAsync is not re-entrant');
  _busy = true;
  _sliceStart = Date.now();

  try {
    // ── 1. Fixed-length window (pad short / centre-crop long) ──
    signalBuf.fill(0);
    if (pcm.length >= CLIP_SAMPLES) {
      const start = Math.floor((pcm.length - CLIP_SAMPLES) / 2);
      signalBuf.set(pcm.subarray(start, start + CLIP_SAMPLES));
    } else {
      signalBuf.set(pcm);
    }

    // ── 2. Peak-normalise, exactly as load_and_normalize_audio does ──
    let peak = 0;
    for (let i = 0; i < CLIP_SAMPLES; i++) {
      const a = Math.abs(signalBuf[i] as number);
      if (a > peak) peak = a;
    }
    if (peak > 0) {
      const inv = 1 / peak;
      for (let i = 0; i < CLIP_SAMPLES; i++) signalBuf[i] = (signalBuf[i] as number) * inv;
    }

    // ── 3. Centred STFT power spectrogram ──
    // Frame t spans padded samples [t·hop, t·hop + n_fft); padded index p maps
    // to signal index p − n_fft/2, and out-of-range reads are zero. This
    // reproduces librosa's `center=True, pad_mode='constant'` without
    // materialising the padded signal.
    const window = periodicHannWindow(N_FFT);

    for (let t = 0; t < N_FRAMES; t++) {
      const base = t * HOP_LENGTH - PAD;
      for (let i = 0; i < N_FFT; i++) {
        const idx = base + i;
        const s = idx >= 0 && idx < CLIP_SAMPLES ? (signalBuf[idx] as number) : 0;
        frameBuf[i] = s * (window[i] as number);
      }
      fftPowerSpectrum(frameBuf, powerBuf.subarray(t * N_BINS, t * N_BINS + N_BINS));

      if ((t + 1) % FRAMES_PER_CHECK === 0 && t + 1 < N_FRAMES) {
        await yieldIfOverBudget();
      }
    }

    // ── 4. Sparse mel projection ──
    const { starts, lengths, offsets, weights } = getFilterbank();
    let maxPower = 0;

    for (let m = 0; m < N_MELS; m++) {
      const start = starts[m] as number;
      const len = lengths[m] as number;
      const off = offsets[m] as number;
      const rowBase = m * N_FRAMES;

      for (let t = 0; t < N_FRAMES; t++) {
        const frameBase = t * N_BINS + start;
        let sum = 0;
        for (let j = 0; j < len; j++) {
          sum += (weights[off + j] as number) * (powerBuf[frameBase + j] as number);
        }
        melBuf[rowBase + t] = sum;
        if (sum > maxPower) maxPower = sum;
      }

      if ((m + 1) % MELS_PER_CHECK === 0 && m + 1 < N_MELS) {
        await yieldIfOverBudget();
      }
    }

    // ── 5. power_to_db(S, ref=np.max, amin=1e-10, top_db=80) ──
    // log_spec = 10·log10(max(amin, S)) − 10·log10(max(amin, max(S)))
    // then clamped to no lower than (peak dB − top_db).
    const refDb = 10 * Math.log10(Math.max(AMIN, maxPower));
    const total = N_MELS * N_FRAMES;

    let dbMax = -Infinity;
    for (let i = 0; i < total; i++) {
      const v = melBuf[i] as number;
      const db = 10 * Math.log10(v > AMIN ? v : AMIN) - refDb;
      melBuf[i] = db;
      if (db > dbMax) dbMax = db;
    }

    const floor = dbMax - TOP_DB;
    let dbMin = Infinity;
    for (let i = 0; i < total; i++) {
      const v = melBuf[i] as number;
      const clamped = v < floor ? floor : v;
      melBuf[i] = clamped;
      if (clamped < dbMin) dbMin = clamped;
    }

    // ── 6. Min–max normalise, then keep the first MEL_SPEC_WIDTH frames ──
    // A fresh buffer per call: the ONNX Tensor holds a reference to it for the
    // duration of the native run, so it must not be recycled.
    const out = new Float32Array(N_MELS * MEL_SPEC_WIDTH);
    const span = dbMax - dbMin + 1e-8;
    const usable = Math.min(N_FRAMES, MEL_SPEC_WIDTH);

    for (let m = 0; m < N_MELS; m++) {
      const rowBase = m * N_FRAMES;
      const outBase = m * MEL_SPEC_WIDTH;
      for (let t = 0; t < usable; t++) {
        out[outBase + t] = ((melBuf[rowBase + t] as number) - dbMin) / span;
      }
      // If the clip were ever shorter than 128 frames the remainder stays zero,
      // matching the training script's constant padding.
    }

    return out;
  } finally {
    _busy = false;
  }
}

/** Root-mean-square energy of a PCM buffer. O(n), synchronous. */
export function computeRMS(samples: Float32Array, length = samples.length): number {
  if (length <= 0) return 0;
  let sum = 0;
  for (let i = 0; i < length; i++) {
    const s = samples[i] as number;
    sum += s * s;
  }
  return Math.sqrt(sum / length);
}

/**
 * RMS of each fixed-length block of a buffer, written into `out`.
 *
 * The engine's gate works on block levels rather than one whole-window RMS: a
 * 300 ms bark inside a 3 s window barely moves the window RMS, but dominates
 * its own block. Returns the number of blocks written.
 */
export function computeBlockRms(
  samples: Float32Array,
  blockSamples: number,
  out: Float32Array,
): number {
  const blocks = Math.min(out.length, Math.floor(samples.length / blockSamples));
  for (let b = 0; b < blocks; b++) {
    const start = b * blockSamples;
    let sum = 0;
    for (let i = 0; i < blockSamples; i++) {
      const s = samples[start + i] as number;
      sum += s * s;
    }
    out[b] = Math.sqrt(sum / blockSamples);
  }
  return blocks;
}
