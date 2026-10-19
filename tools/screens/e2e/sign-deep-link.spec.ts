import { test, expect } from '@playwright/test'
import { getStarterUnit } from '../../../apps/learn/src/data/curriculum'
import { glossLabel, translationOf } from '../../../apps/learn/src/data/translations'
import { SENTENCES } from '../../../apps/learn/src/data/sentences'

test('a sign link opens the first Starter gloss in Practice Watch', async ({ page }) => {
  const gloss = getStarterUnit().signs[0]
  // Dismiss only the existing first-sign guide; do not seed an entered flag or
  // practice session, so the link itself must skip the landing and pick a sign.
  await page.addInitScript(() => localStorage.setItem('suvana.learn.onboarding-seen', '1'))
  await page.goto(`./?sign=${encodeURIComponent(gloss)}`)
  await expect(page.locator('.app-hero-mode')).toHaveCount(0)
  await expect(page.getByRole('tab', { name: /Practice/ }).first()).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('.practice-lesson-title h1')).toHaveText(translationOf(gloss) ?? glossLabel(gloss))
  await expect(page.getByRole('button', { name: 'Watch', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'My turn', exact: true })).toBeVisible()
  await expect(page.locator('.practice-reference-card .reference-canvas')).toBeVisible()
  await page.reload()
  await expect(page.locator('.practice-lesson-title h1')).toHaveText(translationOf(gloss) ?? glossLabel(gloss))
  await expect(page.getByRole('button', { name: 'Watch', exact: true })).toHaveAttribute('aria-pressed', 'true')
})

test('ignored sign links preserve the normal landing and entered-tab behavior', async ({ page }) => {
  const gloss = getStarterUnit().signs[0]
  for (const sign of ['', 'UNKNOWN-I14', gloss.toLowerCase(), SENTENCES[0].gloss]) {
    await page.goto(`./?sign=${encodeURIComponent(sign)}`)
    await expect(page.locator('.app-hero-mode')).toBeVisible()
    await expect(page.locator('.practice-lesson-title h1')).toHaveCount(0)
  }
  await page.addInitScript(() => sessionStorage.setItem('suvana.learn.entered', '1'))
  await page.goto('./?sign=UNKNOWN-I14')
  await expect(page.getByRole('tab', { name: /Path/ }).first()).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('.app-hero-mode')).toHaveCount(0)
})

test('an unavailable index ignores the link and returns to the normal landing', async ({ page }) => {
  await page.route('**/reference-index.json*', route => route.fulfill({ status: 503, body: 'Unavailable' }))
  await page.goto(`./?sign=${encodeURIComponent(getStarterUnit().signs[0])}`)
  await expect(page.locator('.app-hero-mode')).toBeVisible()
})
