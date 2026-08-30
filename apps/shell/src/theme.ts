/**
 * The theme toggle, shared by every page the shell serves.
 *
 * The initial `data-theme` is set by an inline script in each document's
 * <head> — before first paint, so there is no flash of the wrong theme. This
 * module only owns the button: painting it, and the circular View Transition
 * wipe when it is pressed.
 */

const SUN =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></svg>'
const MOON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>'

export function initTheme(): void {
  const themeBtn = document.getElementById('theme-toggle')

  const paint = (theme: string) => {
    if (!themeBtn) return
    const next = theme === 'dark' ? 'light' : 'dark'
    themeBtn.innerHTML = theme === 'dark' ? SUN : MOON
    themeBtn.setAttribute('aria-label', 'Switch to ' + next + ' theme')
    themeBtn.setAttribute('title', 'Switch to ' + next + ' theme')
  }

  paint(document.documentElement.dataset.theme || 'light')
  if (!themeBtn) return

  themeBtn.addEventListener('click', () => {
    const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'

    const switchTheme = () => {
      document.documentElement.dataset.theme = nextTheme
      paint(nextTheme)
      try {
        localStorage.setItem('suvana.theme', nextTheme)
      } catch {
        /* private browsing */
      }
      window.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme: nextTheme } }))
    }

    const startViewTransition = (document as Document & {
      startViewTransition?: (cb: () => void) => { ready: Promise<void>; finished: Promise<void> }
    }).startViewTransition

    if (!startViewTransition) {
      switchTheme()
      return
    }

    const rect = themeBtn.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2
    const maxRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    )

    const transition = startViewTransition.call(document, switchTheme)

    // Prevent a frozen cursor/overlay during the wipe.
    document.body.classList.add('is-transitioning')
    void transition.finished.finally(() => {
      document.body.classList.remove('is-transitioning')
    })

    void transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${maxRadius}px at ${x}px ${y}px)`],
        },
        {
          duration: 800,
          easing: 'ease-in-out',
          pseudoElement: '::view-transition-new(root)',
        },
      )
    })
  })
}
