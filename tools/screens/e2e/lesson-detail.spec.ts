import { test, expect, type Page } from '@playwright/test'
import { CURRICULUM_UNITS } from '../../../apps/learn/src/data/curriculum'
import { glossLabel } from '../../../apps/learn/src/data/translations'

async function enter(page: Page, theme: string) {
  await page.addInitScript(theme => {
    sessionStorage.setItem('suvana.learn.entered', '1')
    localStorage.setItem('suvana.learn.onboarding-seen', '1')
    localStorage.setItem('suvana.theme', theme)
  }, theme)
  await page.goto('./')
  await expect(page.locator('.path-card').first()).toBeVisible()
}

async function assertReadable(page: Page, index: number) {
  const unit = CURRICULUM_UNITS[index]
  await expect(page.locator('#path-title')).toHaveText(unit.title)
  await expect(page.locator('.path-signs li strong')).toHaveText(unit.signs.map(glossLabel))
  await expect(page.getByText('Up to 8 signs, with reviews mixed in. One scored try finishes each step.', { exact: true })).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(await page.locator('.path-signs li').evaluateAll(rows => rows.flatMap((row, index) => {
    const bounds = row.getBoundingClientRect(), actions = row.querySelector('.path-actions')!.getBoundingClientRect()
    const range = document.createRange()
    range.selectNodeContents(row.querySelector('strong')!)
    const failures: string[] = []
    for (const ink of range.getClientRects()) {
      if (ink.left < bounds.left || ink.right > bounds.right || ink.top < bounds.top || ink.bottom > bounds.bottom) failures.push(`${index}: clipped text`)
      if (ink.left < actions.right && ink.right > actions.left && ink.top < actions.bottom && ink.bottom > actions.top) failures.push(`${index}: text overlaps actions`)
    }
    for (const button of row.querySelectorAll('button')) {
      const r = button.getBoundingClientRect()
      if (r.height < 44 || r.width < 44 || r.left < bounds.left || r.right > bounds.right) failures.push(`${index}: action target`)
    }
    return failures
  }))).toEqual([])
}

for (const theme of ['light', 'dark']) {
  for (const width of [360, 390, 1280]) {
    test(`lesson actions and reference controls fit ${width}px in ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: width >= 900 ? 800 : 844 })
      await enter(page, theme)
      await page.locator('.path-card').first().click()
      await assertReadable(page, 0)
      const watch = page.getByRole('button', { name: `Watch ${CURRICULUM_UNITS[0].signs[0]}`, exact: true })
      await watch.focus()
      await page.keyboard.press('Enter')
      const preview = page.locator('.path-preview')
      await expect(preview.locator('h3')).toBeFocused()
      await expect(preview.locator('canvas')).toBeVisible()
      const controls = await preview.locator('.player-controls').boundingBox()
      const header = await page.locator('.aww-app-bar').boundingBox()
      const dock = width < 900 ? await page.locator('.aww-nav-mobile').boundingBox() : null
      expect(controls!.x).toBeGreaterThanOrEqual(8)
      expect(controls!.x + controls!.width).toBeLessThanOrEqual(width - 8)
      expect(controls!.y).toBeGreaterThan(header!.y + header!.height)
      expect(controls!.y + controls!.height).toBeLessThanOrEqual(dock?.y ?? 800)
      await preview.getByRole('button', { name: '0.25x', exact: true }).click()
      await expect(preview.getByRole('button', { name: '0.25x', exact: true })).toHaveAttribute('aria-pressed', 'true')
      await preview.getByRole('button', { name: 'Next frame', exact: true }).click()
      await expect(preview.getByRole('button', { name: 'Play', exact: true })).toBeVisible()
      await preview.getByRole('button', { name: 'Close reference', exact: true }).focus()
      await page.keyboard.press('Enter')
      await expect(preview).toHaveCount(0)
      await expect(watch).toBeFocused()
      await page.getByRole('button', { name: `Try ${CURRICULUM_UNITS[0].signs[0]}`, exact: true }).click()
      await expect(page.locator('.aww-pane-title').first()).toContainText(CURRICULUM_UNITS[0].signs[0])
    })
  }

  test(`long lesson and sign names stay readable on a narrow phone in ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 844 })
    await enter(page, theme)
    const index = CURRICULUM_UNITS.reduce((best, unit, index, units) => {
      const length = (i: number) => Math.max(units[i].title.length, ...units[i].signs.map(gloss => glossLabel(gloss).length))
      return length(index) > length(best) ? index : best
    }, 0)
    await page.locator('.path-card').nth(index).click()
    await assertReadable(page, index)
    await page.getByRole('button', { name: 'Back to path', exact: true }).click()
    await expect(page.locator('.path-card').nth(index)).toBeFocused()
  })
}
