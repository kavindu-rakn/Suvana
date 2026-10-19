import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { Stars } from '../learner/game'
import { LessonStars } from './LessonStars'

describe('lesson star milestones', () => {
  // Synthetic star counts only; no learner results.
  it.each<{ stars: Stars[] }>([{ stars: [] }, { stars: [0] }, { stars: [3, 3, 0] }, { stars: [0, 1, 2] }])('shows nothing for empty or incomplete lessons: $stars', ({ stars }) => {
    expect(renderToStaticMarkup(createElement(LessonStars, { stars }))).toBe('')
  })
  it.each<{ stars: Stars[]; icon: string; label: string }>([
    { stars: [1, 1], icon: 'star-half', label: 'At least 1 star on every sign' },
    { stars: [3, 1, 2], icon: 'star-half', label: 'At least 1 star on every sign' },
    { stars: [2, 2], icon: 'star-check', label: 'At least 2 stars on every sign' },
    { stars: [3, 2, 3], icon: 'star-check', label: 'At least 2 stars on every sign' },
    { stars: [3, 3], icon: 'star', label: 'All stars earned' },
  ])('renders $icon for $stars with an accessible label', ({ stars, icon, label }) => {
    const html = renderToStaticMarkup(createElement(LessonStars, { stars }))
    expect(html).toContain(`lucide-${icon}`)
    expect(html).toContain(`aria-label="${label}"`)
    expect(html).not.toContain('path-state')
  })
})
