/** Keep Spotlight's active result inside the rendered list, including wrap. */
export function nextPracticeSearchResult(
  current: number,
  count: number,
  direction: 1 | -1,
): number {
  if (count <= 0) return -1
  if (current < 0 || current >= count) return direction === 1 ? 0 : count - 1
  return (current + direction + count) % count
}

/** Fit the mobile panel inside the visible viewport, including a soft keyboard. */
export function practiceSearchViewport(height: number, offsetTop: number) {
  const inset = Math.min(height * 0.12, 100)
  return { top: offsetTop + inset, maxHeight: Math.max(0, Math.min(height * 0.76, height - inset - 16)) }
}
