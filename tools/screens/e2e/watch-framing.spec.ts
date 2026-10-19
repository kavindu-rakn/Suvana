import { test, expect } from '@playwright/test'
import { startFirstLesson } from './helpers/navigation'
import { chooseReferenceSpeed } from './helpers/reference-player'

for (const width of [360, 390, 767, 768, 1280]) {
  test(`Watch initial framing and manual choice at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 800 })
    await page.addInitScript(() => localStorage.setItem('suvana.learn.onboarding-seen', '1'))
    await page.goto('./')
    await startFirstLesson(page)
    const zoom = page.getByRole('button', { name: 'Zoom to hands', exact: true })
    await expect(page.locator('.reference-player').first().getByRole('button', { name: 'Pause', exact: true })).toBeInViewport()
    await expect(zoom).toHaveAttribute('aria-pressed', String(width < 768))
    if (width < 768) {
      await expect(page.locator('.reference-framing')).toContainText('Zoomed to the hands')
      await zoom.click()
      await expect(zoom).toHaveAttribute('aria-pressed', 'false')
      await expect(page.locator('.aww-pane-left canvas')).toHaveClass(/is-raw/)
      await chooseReferenceSpeed(page.locator('.reference-player').first(), '0.25')
      await expect(zoom).toHaveAttribute('aria-pressed', 'false')
    } else {
      await zoom.click()
      await expect(zoom).toHaveAttribute('aria-pressed', 'true')
    }
    await page.getByRole('button', { name: 'My turn', exact: true }).click()
    await expect(zoom).toHaveAttribute('aria-pressed', 'false')
    await page.getByRole('button', { name: '1. Watch', exact: true }).click()
    await expect(zoom).toHaveAttribute('aria-pressed', String(width < 768))
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}
