import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, expect, it, vi } from 'vitest'
import { AccountButton } from './AccountButton'
import { Hero } from '../components/Hero'

// ThemeToggle reads the browser's theme at mount; navigation is the subject here.
vi.mock('../components/ThemeToggle', () => ({ ThemeToggle: () => null }))

afterEach(() => vi.unstubAllEnvs())

it('renders no platform account or home navigation in standalone Learn', () => {
  vi.stubEnv('VITE_SUVANA', '')
  vi.stubEnv('BASE_URL', '/')
  for (const user of [undefined, null, { name: 'Learner' }]) {
    expect(renderToStaticMarkup(createElement(AccountButton, { user }))).toBe('')
  }
  const hero = renderToStaticMarkup(createElement(Hero, { onEnter: vi.fn() }))
  expect(hero).not.toContain('Back to Home')
  expect(hero).toContain('<div class="nav-left brand">')
  expect(hero).toContain('src="/branding/suvana-mark.png"')
})

it('preserves platform navigation and base-prefixed branding in Suvana', () => {
  vi.stubEnv('VITE_SUVANA', '1')
  vi.stubEnv('BASE_URL', '/learn/')
  const account = renderToStaticMarkup(createElement(AccountButton, { user: null }))
  expect(account).toContain('/login?callbackUrl=%2Flearn%2F')
  const hero = renderToStaticMarkup(createElement(Hero, { onEnter: vi.fn() }))
  expect(hero).toContain('Back to Home')
  expect(hero).toContain('<a href="/" class="nav-left brand">')
  expect(hero).toContain('src="/learn/branding/suvana-mark.png"')
})
