export interface CounterClock {
  now(): number
  request(callback: FrameRequestCallback): number
  cancel(id: number): void
}

/** Decorative activity counter, not a measured download percentage. Only an
 * actual completion event may show 100; waiting never delays readiness. */
export function activityCounter(write: (value: number) => void, clock: CounterClock, reducedMotion = false) {
  let frame: number | undefined
  const started = clock.now()
  let stopped = false
  write(0)
  const tick = () => {
    if (stopped) return
    const value = Math.min(95, Math.floor(100 * (1 - Math.exp(-(clock.now() - started) / 2400))))
    write(value)
    frame = value < 95 ? clock.request(tick) : undefined
  }
  if (!reducedMotion) frame = clock.request(tick)
  const stop = () => {
    stopped = true
    if (frame !== undefined) clock.cancel(frame)
  }
  return { cancel: stop, complete: () => { stop(); write(100) } }
}

export function registrationNavigation(event: Pick<MouseEvent, 'button' | 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey' | 'defaultPrevented'>,
  link: { href: string; target: string; download: boolean }, currentUrl: string) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
    || link.download || (link.target && link.target !== '_self')) return false
  const current = new URL(currentUrl), target = new URL(link.href, current)
  return target.origin === current.origin && /^\/register\/?$/.test(target.pathname)
}
