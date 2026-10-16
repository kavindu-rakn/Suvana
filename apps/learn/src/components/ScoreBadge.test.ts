import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ScoreBadge } from './ScoreBadge'
import type { HandFeedback } from './ScoreBadge'

describe('result-card calibrated finger display', () => {
  const hand: HandFeedback = { handedness: 'Left', score: 73,
    fingers: [{ finger: 'thumb', state: 'correct' }, { finger: 'index', state: 'almost' }, { finger: 'pinky', state: 'wrong' }] }
  it('uses anatomical names and the approved words without finger numbers', () => {
    const html = renderToStaticMarkup(createElement(ScoreBadge, { score: 73, hands: [hand] }))
    expect(html).toContain('Left hand')
    expect(html).toContain('<dt>Little finger</dt>')
    expect(html).toContain('data-state="correct">Correct</dd>')
    expect(html).toContain('data-state="almost">Almost</dd>')
    expect(html).toContain('data-state="wrong">Wrong</dd>')
    expect(html.slice(html.indexOf('<section')).replace(/<[^>]+>/g, '')).not.toMatch(/\d|%/)
  })
  it('omits finger feedback for unsupported references and missing hands', () => {
    for (const h of [{ handedness: 'Left', score: 73 } as HandFeedback, { ...hand, missing: true }]) {
      const html = renderToStaticMarkup(createElement(ScoreBadge, { score: 73, hands: [h] }))
      expect(html).not.toContain('aria-label="Finger feedback"')
    }
  })
})
