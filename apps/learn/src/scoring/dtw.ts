export interface DtwResult {
  /** Total accumulated cost along the best alignment path. */
  distance: number
  /** distance divided by path length — the average per-step cost, comparable
   *  across sequences of different lengths. */
  normalizedDistance: number
  /** Aligned index pairs [attemptIndex, referenceIndex], start → end. */
  path: Array<[number, number]>
}

/**
 * Classic dynamic time warping. `cost(i, j)` gives the local distance between
 * element i of sequence A (length n) and element j of sequence B (length m).
 * DTW finds the monotonic alignment of the two sequences that minimises total
 * cost, allowing either sequence to "wait" — which is exactly how it absorbs
 * differences in signing speed.
 *
 * O(n·m) time and memory; fine for the ~100–250-frame sequences we compare.
 */
export function dtw(n: number, m: number, cost: (i: number, j: number) => number): DtwResult {
  if (n === 0 || m === 0) {
    return { distance: Infinity, normalizedDistance: Infinity, path: [] }
  }

  // Accumulated cost matrix with a padded top/left border of Infinity.
  const D: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(Infinity))
  D[0][0] = 0

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const c = cost(i - 1, j - 1)
      const best = Math.min(
        D[i - 1][j], // A waits (insertion)
        D[i][j - 1], // B waits (deletion)
        D[i - 1][j - 1], // match
      )
      D[i][j] = c + best
    }
  }

  // Backtrack from (n, m) to (1, 1) to recover the alignment.
  const path: Array<[number, number]> = []
  let i = n
  let j = m
  while (i > 0 && j > 0) {
    path.push([i - 1, j - 1])
    const diag = D[i - 1][j - 1]
    const up = D[i - 1][j]
    const left = D[i][j - 1]
    if (diag <= up && diag <= left) {
      i--
      j--
    } else if (up <= left) {
      i--
    } else {
      j--
    }
  }
  path.reverse()

  return {
    distance: D[n][m],
    normalizedDistance: D[n][m] / path.length,
    path,
  }
}
