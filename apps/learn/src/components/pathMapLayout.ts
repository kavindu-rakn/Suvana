export function pathSlot(index: number) {
  const row = Math.floor(index / 3)
  return { row: row + 1, column: (row % 2 === 0 ? index % 3 : 2 - index % 3) + 1 }
}

export interface PathPoint { x: number; y: number; width: number }

/** Cross card centres horizontally, anchoring every turn at a side midpoint. */
export function pathCurve(points: readonly PathPoint[], width: number, desktop: boolean): string {
  if (points.length < 2) return ''
  let curve = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    const previous = points[i - 1], next = points[i]
    if (desktop && Math.abs(previous.y - next.y) < 1) {
      curve += ` L ${next.x} ${next.y}`
    } else {
      // Odd mobile lessons turn right, even lessons turn left. Desktop turns
      // stay on the outside of each three-card row. Horizontal tangents at
      // both edge anchors prevent a curve cutting across a card's corner.
      const side = desktop ? (previous.x > width / 2 ? 1 : -1) : (i % 2 === 1 ? 1 : -1)
      const from = previous.x + side * previous.width / 2
      const to = next.x + side * next.width / 2
      const turn = side === 1 ? width - 6 : 6
      const radius = Math.min(36, Math.abs(turn - from), Math.abs(turn - to), (next.y - previous.y) / 2)
      const shoulder = turn - side * radius
      // The outside rail stays clear of the entire next card, even when the
      // two cards' side anchors are far apart on a wide mobile/tablet view.
      curve += ` L ${from} ${previous.y} H ${shoulder} Q ${turn} ${previous.y}, ${turn} ${previous.y + radius} V ${next.y - radius} Q ${turn} ${next.y}, ${shoulder} ${next.y} H ${to} L ${next.x} ${next.y}`
    }
  }
  return curve
}
