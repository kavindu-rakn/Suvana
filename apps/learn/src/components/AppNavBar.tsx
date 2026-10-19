import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Tab } from '../app/tabs'
import { ALL_TABS, ICONS } from '../app/tabs'
import { shortcutBlockedByTarget } from '../app/keyboard'
import { ThemeToggle } from './ThemeToggle'

interface AppNavBarProps {
  tab: Tab
  tabs: Tab[]
  onSelectTab: (tab: Tab) => void
  onLeaveToHero: () => void
  /** Optional far-right slot, e.g. an account link. Nothing renders without it. */
  account?: ReactNode
}

export function AppNavBar({
  tab,
  tabs,
  onSelectTab,
  onLeaveToHero,
  account,
}: AppNavBarProps) {
  const tabsContainerRef = useRef<HTMLDivElement>(null)
  const tabButtonRefs = useRef<Map<Tab, HTMLButtonElement>>(new Map())
  const [indicatorStyle, setIndicatorStyle] = useState<{
    left: number
    width: number
    opacity: number
  }>({ left: 0, width: 0, opacity: 0 })

  // Update the sliding active pill indicator position
  useEffect(() => {
    const updateIndicator = () => {
      const container = tabsContainerRef.current
      const activeButton = tabButtonRefs.current.get(tab)
      if (container && activeButton) {
        const containerRect = container.getBoundingClientRect()
        const buttonRect = activeButton.getBoundingClientRect()
        setIndicatorStyle({
          left: buttonRect.left - containerRect.left,
          width: buttonRect.width,
          opacity: 1,
        })
      }
    }

    // Run on frame to ensure layout computation is complete
    const rId = requestAnimationFrame(updateIndicator)
    window.addEventListener('resize', updateIndicator)

    let ro: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined' && tabsContainerRef.current) {
      ro = new ResizeObserver(updateIndicator)
      ro.observe(tabsContainerRef.current)
    }

    return () => {
      cancelAnimationFrame(rId)
      window.removeEventListener('resize', updateIndicator)
      ro?.disconnect()
    }
  }, [tab, tabs])

  // Global keyboard shortcuts: 1, 2, 3... to jump tabs; Esc to go to Hero.
  // A view that uses a key itself (Practice's Esc cancels a countdown) calls
  // preventDefault from a capture-phase listener, which runs before this one.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return
      // A modal owns keyboard navigation even while focus visits browser chrome.
      if (document.querySelector('dialog[open]')) return
      if (shortcutBlockedByTarget(e.key, e.target)) return

      if (e.key === 'Escape') {
        onLeaveToHero()
        return
      }

      const num = parseInt(e.key, 10)
      if (!isNaN(num) && num >= 1 && num <= tabs.length) {
        e.preventDefault()
        const targetTab = tabs[num - 1]
        if (targetTab) {
          onSelectTab(targetTab)
          tabButtonRefs.current.get(targetTab)?.focus()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [tabs, onSelectTab, onLeaveToHero])

  return (
    <>
      <header className="aww-app-bar">
        <div className="aww-app-bar-inner">
          {/* Left Flank: Luxury Suvana Brand Lockup with Smooth Morphing Back Arrow */}
          <button
            className="aww-app-brand"
            onClick={onLeaveToHero}
            aria-label="Return to overview"
            title="Return to overview (Esc)"
          >
            <div className="aww-app-brand-mark-wrap">
              <img
                className="aww-app-brand-mark"
                src={`${import.meta.env.BASE_URL}branding/suvana-mark.png`}
                alt="Suvana Logo"
              />
              <span className="aww-brand-back-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </span>
            </div>

            <span className="wordmark">SUVANA</span>
            <span className="aww-brand-pill">LEARN</span>
          </button>

          {/* Desktop Center: Floating Segmented Control */}
          <nav
            className="aww-nav-segmented aww-nav-desktop"
            ref={tabsContainerRef}
            aria-label="Sections"
            role="tablist"
          >
            {/* Sliding illuminated pill background */}
            <div
              className="aww-nav-active-slider"
              style={{
                transform: `translateX(${indicatorStyle.left}px)`,
                width: `${indicatorStyle.width}px`,
                opacity: indicatorStyle.opacity,
              }}
              aria-hidden="true"
            />

            {tabs.map((id, index) => {
              const isActive = tab === id
              return (
                <button
                  key={id}
                  ref={(el) => {
                    if (el) tabButtonRefs.current.set(id, el)
                    else tabButtonRefs.current.delete(id)
                  }}
                  role="tab"
                  aria-selected={isActive}
                  tabIndex={isActive ? 0 : -1}
                  className={`aww-nav-tab ${isActive ? 'is-active' : ''}`}
                  onClick={() => onSelectTab(id)}
                >
                  <svg
                    className="aww-nav-tab-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d={ICONS[id]} />
                  </svg>
                  <span className="aww-nav-tab-label">{ALL_TABS[id]}</span>
                  <span className="aww-nav-tab-hotkey" aria-hidden="true" title={`Shortcut: ${index + 1}`}>
                    {index + 1}
                  </span>
                </button>
              )
            })}
          </nav>

          {/* Right Flank: Utility Suite */}
          <div className="aww-app-actions">
            {/* Luxury Theme Switcher */}
            <div className="aww-theme-toggle-wrap">
              <ThemeToggle />
            </div>

            <span hidden>{account}</span>
          </div>
        </div>
      </header>

      {/* Mobile Floating Bottom Navigation Dock (rendered outside header so position: fixed works unconditionally) */}
      <nav
        className="aww-nav-segmented aww-nav-mobile"
        aria-label="Mobile navigation"
        role="tablist"
      >
        {tabs.map((id) => {
          const isActive = tab === id
          return (
            <button
              key={id}
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              className={`aww-nav-tab ${isActive ? 'is-active' : ''}`}
              onClick={() => onSelectTab(id)}
            >
              <svg
                className="aww-nav-tab-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d={ICONS[id]} />
              </svg>
              <span className="aww-nav-tab-label">{ALL_TABS[id]}</span>
            </button>
          )
        })}
      </nav>
    </>
  )
}
