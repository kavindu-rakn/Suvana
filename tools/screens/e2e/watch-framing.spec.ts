import { test, expect } from '@playwright/test'
import { startFirstLesson } from './helpers/navigation'
import { chooseReferenceSpeed } from './helpers/reference-player'

for (const width of [360, 390, 767, 768, 1280]) {
  test(`Watch and Try always use hand framing at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 800 })
    await page.addInitScript(() => localStorage.setItem('suvana.learn.onboarding-seen', '1'))
    await page.goto('./')
    await startFirstLesson(page)
    const player = page.locator('.reference-player').first()
    await expect(player.getByRole('button', { name: 'Pause', exact: true })).toBeInViewport()
    await expect(player.locator('canvas')).toHaveClass(/mirrored/)
    await expect(player.locator('canvas')).not.toHaveClass(/is-raw/)
    await expect(page.locator('.reference-framing')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Zoom to hands', exact: true })).toHaveCount(0)
    await chooseReferenceSpeed(player, '0.25')
    await expect(player.locator('canvas')).not.toHaveClass(/is-raw/)
    if (width === 1280) {
      await player.getByRole('button', { name: 'Pause', exact: true }).click()
      const seek = player.getByRole('slider', { name: 'Seek', exact: true })
      await seek.focus()
      await page.keyboard.press('Home')
      await expect(seek).toHaveAttribute('aria-valuenow', '0')
      // Check actual ink, rather than only a class: the first BAG EKA pose
      // must occupy more canvas space than its original recorded coordinates.
      const enlargement = await player.locator('canvas').evaluate(async canvas => {
        const reference = await (await fetch('references/kaggle_BAG_EKA.json')).json()
        const xs = reference.frames[0].hands.flatMap((hand: { landmarks: { x: number }[] }) => hand.landmarks.map(point => point.x))
        const rawWidth = (Math.max(...xs) - Math.min(...xs)) * canvas.width
        const pixels = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data
        let left = canvas.width, right = 0
        for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
          if (pixels[(y * canvas.width + x) * 4 + 3] > 0) { left = Math.min(left, x); right = Math.max(right, x) }
        }
        return (right - left) / rawWidth
      })
      expect(enlargement).toBeGreaterThan(2)
    }
    await page.getByRole('button', { name: 'My turn', exact: true }).click()
    await expect(player.locator('canvas')).toBeVisible()
    await expect(player.locator('canvas')).not.toHaveClass(/is-raw/)
    await page.getByRole('button', { name: '1. Watch', exact: true }).click()
    await expect(player.locator('canvas')).not.toHaveClass(/is-raw/)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}
