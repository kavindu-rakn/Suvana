/**
 * SoundGuard — Radix-2 FFT (allocation-free, table-driven)
 * ─────────────────────────────────────────────────────────────────────────────
 * Rewritten for real-time use on the JS thread. The maths is identical to the
 * previous implementation; the cost profile is not.
 *
 * What changed and why it matters at 126 FFTs per analysis window:
 *
 *   1. Twiddle factors are pre-computed once per FFT size instead of being
 *      re-derived per butterfly with an incremental rotation. That removes
 *      4 multiplies + 2 adds from the inner loop and eliminates the numerical
 *      drift the recurrence introduced across 11 stages.
 *
 *   2. The bit-reversal permutation is a pre-computed Uint16Array lookup and is
 *      applied during the copy-in. The old code swapped with array
 *      destructuring — `[re[i], re[j]] = [re[j], re[i]]` — which allocates a
 *      throwaway array per swap. At ~1024 swaps × 126 frames that was ~129 000
 *      short-lived allocations per window, and the GC pauses that came with
 *      them landed squarely on the UI thread.
 *
 *   3. All scratch buffers (real, imaginary, window, output spectrogram) are
 *      allocated once and reused. The previous version allocated five typed
 *      arrays per frame.
 *
 * Everything here is pure and synchronous; cooperative yielding is the caller's
 * responsibility (see melSpectrogram.ts).
 */

type FftTables = {
  n: number;
  /** cos(-2πk/N) for k in [0, N/2). */
  cos: Float32Array;
  /** sin(-2πk/N) for k in [0, N/2). */
  sin: Float32Array;
  /** Bit-reversed index lookup. */
  rev: Uint16Array;
  /** Scratch real component. */
  re: Float32Array;
  /** Scratch imaginary component. */
  im: Float32Array;
};

const tableCache = new Map<number, FftTables>();

function buildTables(n: number): FftTables {
  if (n < 2 || (n & (n - 1)) !== 0) {
    throw new Error(`FFT length must be a power of two, received ${n}`);
  }
  if (n > 65536) {
    // rev is a Uint16Array; guard the invariant explicitly.
    throw new Error(`FFT length ${n} exceeds the supported maximum of 65536`);
  }

  const half = n >> 1;
  const cos = new Float32Array(half);
  const sin = new Float32Array(half);
  for (let k = 0; k < half; k++) {
    const angle = (-2 * Math.PI * k) / n;
    cos[k] = Math.cos(angle);
    sin[k] = Math.sin(angle);
  }

  // bits = log2(n)
  let bits = 0;
  while (1 << bits < n) bits++;

  const rev = new Uint16Array(n);
  for (let i = 0; i < n; i++) {
    let x = i;
    let r = 0;
    for (let b = 0; b < bits; b++) {
      r = (r << 1) | (x & 1);
      x >>= 1;
    }
    rev[i] = r;
  }

  return { n, cos, sin, rev, re: new Float32Array(n), im: new Float32Array(n) };
}

function getTables(n: number): FftTables {
  let t = tableCache.get(n);
  if (!t) {
    t = buildTables(n);
    tableCache.set(n, t);
  }
  return t;
}

// ─── Hann window cache ───────────────────────────────────────────────────────

const windowCache = new Map<number, Float32Array>();

/**
 * Periodic ("DFT-even") Hann window — divisor N, not N−1.
 *
 * This is what `scipy.signal.get_window('hann', N, fftbins=True)` returns, and
 * therefore what librosa's STFT applies. The symmetric variant (divisor N−1)
 * used previously is the one meant for filter design, not spectral analysis;
 * substituting it puts a small but systematic error into every frame.
 */
export function periodicHannWindow(length: number): Float32Array {
  let w = windowCache.get(length);
  if (w) return w;
  w = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / length);
  }
  windowCache.set(length, w);
  return w;
}

// ─── Core transform ──────────────────────────────────────────────────────────

/**
 * In-place radix-2 Cooley–Tukey FFT of a real-valued frame, writing the power
 * spectrum (|X|²) of the positive frequencies into `out`.
 *
 * @param frame Windowed time-domain samples, length must be a power of two.
 * @param out   Destination, length must be >= n/2 + 1. Written from index 0.
 */
export function fftPowerSpectrum(frame: Float32Array, out: Float32Array): void {
  const n = frame.length;
  const t = getTables(n);
  const { re, im, rev, cos, sin } = t;

  // Copy-in with bit-reversal; imaginary part starts at zero.
  for (let i = 0; i < n; i++) {
    re[i] = frame[rev[i] as number] as number;
    im[i] = 0;
  }

  for (let size = 2; size <= n; size <<= 1) {
    const half = size >> 1;
    const step = n / size;
    for (let base = 0; base < n; base += size) {
      let twiddle = 0;
      for (let k = 0; k < half; k++) {
        const evenIdx = base + k;
        const oddIdx = evenIdx + half;

        const wr = cos[twiddle] as number;
        const wi = sin[twiddle] as number;

        const xr = re[oddIdx] as number;
        const xi = im[oddIdx] as number;

        const tr = wr * xr - wi * xi;
        const ti = wr * xi + wi * xr;

        const er = re[evenIdx] as number;
        const ei = im[evenIdx] as number;

        re[oddIdx] = er - tr;
        im[oddIdx] = ei - ti;
        re[evenIdx] = er + tr;
        im[evenIdx] = ei + ti;

        twiddle += step;
      }
    }
  }

  const bins = (n >> 1) + 1;
  for (let i = 0; i < bins; i++) {
    const r = re[i] as number;
    const m = im[i] as number;
    out[i] = r * r + m * m;
  }
}

/** Number of positive-frequency bins produced for a given FFT size. */
export function binCount(nFft: number): number {
  return (nFft >> 1) + 1;
}

/** Number of STFT frames produced for a signal of `length` samples. */
export function frameCount(length: number, nFft: number, hopLength: number): number {
  if (length < nFft) return 0;
  return Math.floor((length - nFft) / hopLength) + 1;
}
