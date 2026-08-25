import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

const KEY = 'suvana.theme'

/** Whatever the inline script in index.html already decided. */
function current(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

/**
 * Light/dark switch.
 *
 * The theme itself is applied before React exists — an inline script in
 * index.html sets data-theme from the shared `suvana.theme` key, because
 * waiting for hydration to pick a theme is exactly the flash it avoids. This
 * component only flips that attribute and records the choice.
 *
 * The key is shared with the shell and Communicate: all three are served from
 * the same origin, so one preference follows the learner across the platform,
 * and the `storage` event keeps other open tabs in step.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(current)

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== KEY || (e.newValue !== 'light' && e.newValue !== 'dark')) return
      document.documentElement.dataset.theme = e.newValue
      setTheme(e.newValue)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    setTheme(next)
    try {
      localStorage.setItem(KEY, next)
    } catch {
      /* Private mode: the choice applies now but does not persist. */
    }
  }

  const label = `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`

  return (
    <button className="theme-toggle" onClick={toggle} aria-label={label} title={label}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {theme === 'dark' ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
          </>
        ) : (
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
        )}
      </svg>
    </button>
  )
}
