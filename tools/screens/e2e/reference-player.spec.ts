import { test, expect } from '@playwright/test'
import { chooseReferenceSpeed } from './helpers/reference-player'

for (const width of [360, 390, 1280]) {
  test(`Video.js playback, seek, speed and fresh reference at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width < 900 ? 844 : 800 })
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await page.addInitScript(() => {
      sessionStorage.setItem('suvana.learn.entered', '1')
      localStorage.setItem('suvana.learn.onboarding-seen', '1')
    })
    await page.goto('./')
    await page.locator('.path-card').first().click()
    await page.getByRole('button', { name: 'Watch BAG EKA', exact: true }).click()
    const player = page.locator('.path-preview .reference-player')
    await expect(player.locator('.reference-content')).toHaveAttribute('data-speed', '1')
    await player.getByRole('button', { name: 'Pause', exact: true }).click()
    const seek = player.getByRole('slider', { name: 'Seek', exact: true })
    await seek.focus()
    await page.keyboard.press('Home')
    await expect(seek).toHaveAttribute('aria-valuenow', '0')
    await page.waitForTimeout(200)
    await expect(seek).toHaveAttribute('aria-valuenow', '0')
    await page.keyboard.press('End')
    expect(Number(await seek.getAttribute('aria-valuenow'))).toBeGreaterThan(0)
    await chooseReferenceSpeed(player, '0.5')
    await player.getByRole('button', { name: 'Play', exact: true }).click()
    await expect(player.getByRole('button', { name: 'Pause', exact: true })).toBeVisible()
    await page.waitForTimeout(1800)
    await expect(player.locator('.reference-content')).toHaveAttribute('data-speed', '0.5')
    const overlap = await player.evaluate(root => {
      const canvas = root.querySelector('canvas')!.getBoundingClientRect()
      const controls = root.querySelector('.video-controls-content')!.getBoundingClientRect()
      return { overlap: canvas.bottom > controls.top, right: controls.right, left: controls.left }
    })
    expect(overlap.overlap).toBe(false)
    expect(overlap.left).toBeGreaterThanOrEqual(0)
    expect(overlap.right).toBeLessThanOrEqual(width)
    if (width === 1280) {
      await player.getByRole('button', { name: 'Enter fullscreen', exact: true }).click()
      await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true)
      await player.getByRole('button', { name: 'Exit fullscreen', exact: true }).click()
      await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(false)
    }
    await page.getByRole('button', { name: 'Close reference', exact: true }).click()
    await page.getByRole('button', { name: 'Watch BAG EKA', exact: true }).click()
    await expect(player.locator('.reference-content')).toHaveAttribute('data-speed', '1')
    await page.getByRole('button', { name: 'Watch HINAWENAWA', exact: true }).click()
    await expect(player.locator('.reference-content')).toHaveAttribute('data-speed', '1')
    await expect(player.getByRole('button', { name: 'Pause', exact: true })).toBeVisible()
    expect(errors).toEqual([])
  })
}

for (const width of [360, 390, 1280]) {
  test(`sign-browser preview stays usable and Watch resets speed at ${width}px`, async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width, height: width < 900 ? 844 : 800 },
      isMobile: width < 900, hasTouch: width < 900,
    })
    try {
      const page = await context.newPage()
      await page.addInitScript(() => {
        sessionStorage.setItem('suvana.learn.entered', '1')
        localStorage.setItem('suvana.learn.onboarding-seen', '1')
      })
      await page.goto('./')
      await page.locator('.path-card').first().click()
      await page.getByRole('button', { name: 'Practise this unit', exact: true }).click()
      await page.getByRole('button', { name: 'Choose a different sign (Esc)', exact: true }).click()
      await page.getByRole('searchbox', { name: 'Search all signs', exact: true }).fill('BAG EKA')
      await page.getByRole('button', { name: /^Preview / }).first().click()
      const player = page.locator('.practice-preview-dialog .reference-player')
      await expect(player.locator('.reference-content')).toHaveAttribute('data-speed', '1')
      await expect(player.getByRole('button', { name: 'Pause', exact: true })).toBeInViewport()
      await chooseReferenceSpeed(player, '0.25')
      await player.getByRole('button', { name: 'Pause', exact: true }).click()
      await expect(player.getByRole('button', { name: 'Play', exact: true })).toBeVisible()
      expect(await player.locator('.video-controls-content').evaluate(element => {
        const rect = element.getBoundingClientRect()
        return rect.left >= 0 && rect.right <= innerWidth
      })).toBe(true)
      await page.getByRole('button', { name: 'Watch this sign', exact: true }).click()
      await expect(page.locator('.practice-reference-card .reference-content')).toHaveAttribute('data-speed', '1')
      await expect(page.locator('.practice-reference-card .reference-player').getByRole('button', { name: 'Pause', exact: true })).toBeInViewport()
    } finally { await context.close() }
  })
}
