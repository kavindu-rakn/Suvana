import { activityCounter, registrationNavigation } from './loadSequence'

const overlay = document.getElementById('navigation-loader')
const counter = overlay?.querySelector<HTMLElement>('[data-load-count]')
const cancel = overlay?.querySelector<HTMLButtonElement>('[data-load-cancel]')
let animation: ReturnType<typeof activityCounter> | undefined
let trigger: HTMLAnchorElement | null = null
let overflow = ''
let suspended: { element: HTMLElement; inert: boolean }[] = []

function reset(restoreFocus = false) {
  animation?.cancel()
  animation = undefined
  if (!overlay || overlay.hidden) return
  overlay.hidden = true
  document.body.style.overflow = overflow
  suspended.forEach(({ element, inert }) => { element.inert = inert })
  suspended = []
  window.dispatchEvent(new CustomEvent('suvana:navigation-loading', { detail: false }))
  if (restoreFocus) trigger?.focus()
  trigger = null
}

document.addEventListener('click', event => {
  const link = event.target instanceof Element ? event.target.closest('a') : null
  if (!link || !overlay || !counter || !registrationNavigation(event, {
    href: link.href, target: link.target, download: link.hasAttribute('download'),
  }, location.href)) return
  if (overlay.hidden) {
    trigger = link
    overflow = document.body.style.overflow
    overlay.hidden = false
    document.body.style.overflow = 'hidden'
    suspended = [...document.body.children].filter((element): element is HTMLElement => element instanceof HTMLElement && element !== overlay)
      .map(element => ({ element, inert: element.inert }))
    suspended.forEach(({ element }) => { element.inert = true })
    animation = activityCounter(value => { counter.textContent = String(value) }, {
      now: () => performance.now(), request: callback => requestAnimationFrame(callback), cancel: id => cancelAnimationFrame(id),
    }, matchMedia('(prefers-reduced-motion: reduce)').matches)
    cancel?.focus({ preventScroll: true })
    window.dispatchEvent(new CustomEvent('suvana:navigation-loading', { detail: true }))
  }
  // Let the browser navigate immediately. No fetch, preflight or exit animation.
  queueMicrotask(() => { if (event.defaultPrevented) reset(true) })
})

function cancelNavigation() { window.stop(); reset(true) }
cancel?.addEventListener('click', cancelNavigation)
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && overlay && !overlay.hidden) { event.preventDefault(); cancelNavigation() }
})
// Preserve the outgoing frame while Chrome hands over to the next document.
// A cached page is uncovered only when it is actually shown again.
window.addEventListener('pagehide', () => animation?.complete())
window.addEventListener('pageshow', () => reset())
