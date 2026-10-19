export const PATH_PAGE_SIZE = 9

export function pathSlot(index: number) {
  const slot = index % PATH_PAGE_SIZE
  const row = Math.floor(slot / 3)
  return { row: row + 1, column: (row % 2 === 0 ? slot % 3 : 2 - slot % 3) + 1 }
}

export interface PathPoint { x: number; y: number }

/** Join rendered card centres; opaque cards cover the line beneath them. */
export function pathCurve(points: readonly PathPoint[], width: number, desktop: boolean): string {
  if (points.length < 2) return ''
  let curve = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    const previous = points[i - 1], next = points[i]
    if (desktop && Math.abs(previous.y - next.y) < 1) {
      curve += ` L ${next.x} ${next.y}`
    } else if (desktop) {
      // Turn outside the last card in each row to form the mirrored S.
      const edge = previous.x > width / 2 ? width - 4 : 4
      // A cubic reaches 75% of its control-point excursion at mid-turn.
      const turn = previous.x + (edge - previous.x) * 4 / 3
      curve += ` C ${turn} ${previous.y}, ${turn} ${next.y}, ${next.x} ${next.y}`
    } else {
      const bend = (next.y - previous.y) * .65
      curve += ` C ${previous.x} ${previous.y + bend}, ${next.x} ${next.y - bend}, ${next.x} ${next.y}`
    }
  }
  return curve
}
