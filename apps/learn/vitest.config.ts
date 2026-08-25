import { defineConfig } from 'vitest/config'

// The scoring engine is pure math, so tests run in the plain node environment
// (no DOM) for speed.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // The corpus tests (calibration, weight fit, anchor probe) run thousands of
    // DTW alignments over 557 takes — minutes of work on a slow machine, and
    // already ~6 s for the weight fit on kvn's. Vitest's 5 s default failed them
    // as timeouts, which reads as a broken scorer rather than a slow laptop.
    testTimeout: 300_000,
  },
})
