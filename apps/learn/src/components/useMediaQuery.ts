import { useEffect, useState } from 'react'

/**
 * Subscribe to a media query from React.
 *
 * Used to decide *where* the reference replay is rendered — inside the camera
 * stage as a picture-in-picture on a phone, in the side panel on a desktop.
 * That has to be a single decision rather than two CSS-hidden copies: each
 * SkeletonPlayer owns a canvas and a requestAnimationFrame loop, and a hidden
 * one would keep drawing while competing with MediaPipe for the main thread.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)

  useEffect(() => {
    const mql = window.matchMedia(query)
    // Re-read on subscribe: the viewport can change between the initial render
    // and this effect running.
    setMatches(mql.matches)
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}

/** The width at which the record layout stacks and the camera becomes sticky. */
export const STACKED_LAYOUT = '(max-width: 900px)'
