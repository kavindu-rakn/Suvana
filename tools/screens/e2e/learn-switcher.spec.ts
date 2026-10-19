import { test, expect, type Page } from '@playwright/test'

async function enter(page: Page, theme = 'dark', author = false) {
  await page.addInitScript(({ theme, author }) => {
    localStorage.setItem('suvana.theme', theme)
    sessionStorage.setItem('suvana.learn.entered', '1')
    localStorage.setItem('suvana.learn.onboarding-seen', '1')
    if (author) localStorage.setItem('ssl-learn-mode', 'author')
  }, { theme, author })
  await page.goto('./')
  await expect(page.locator('.path-card').first()).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
}

async function aligned(page: Page) {
  await expect.poll(() => page.evaluate(() => {
    const nav = [...document.querySelectorAll<HTMLElement>('.aww-nav-segmented')].find(e => e.getBoundingClientRect().width > 0)!
    const active = nav.querySelector('[aria-selected="true"]')!.getBoundingClientRect()
    const slider = nav.querySelector('.aww-nav-active-slider')!.getBoundingClientRect()
    return Math.max(Math.abs(active.left - slider.left), Math.abs(active.width - slider.width))
  })).toBeLessThan(1)
}

for (const width of [1920, 1280, 861, 860, 390, 360]) for (const theme of ['light', 'dark']) {
  test(`centered sliding switcher at ${width}px in ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: width > 860 ? 800 : 844 })
    await enter(page, theme)
    const nav = page.locator(width > 860 ? '.aww-nav-desktop' : '.aww-nav-mobile')
    await aligned(page)
    const bounds = await nav.boundingBox()
    expect(Math.abs(bounds!.x + bounds!.width / 2 - width / 2)).toBeLessThan(1)
    expect(await page.evaluate(() => {
      const brand = document.querySelector('.aww-app-brand')!.getBoundingClientRect()
      const actions = document.querySelector('.aww-app-actions')!.getBoundingClientRect()
      const nav = document.querySelector('.aww-nav-desktop')!.getBoundingClientRect()
      return nav.width === 0 || (brand.right <= nav.left && nav.right <= actions.left)
    })).toBe(true)
    for (const label of ['Practice', 'Progress', 'Path']) {
      const button = nav.getByRole('tab', { name: label })
      const before = await nav.locator('.aww-nav-active-slider').boundingBox()
      await button.click()
      await expect(button).toHaveAttribute('aria-selected', 'true')
      const target = await button.boundingBox()
      await page.waitForTimeout(35)
      const during = await nav.locator('.aww-nav-active-slider').boundingBox()
      expect(during!.x).toBeGreaterThanOrEqual(Math.min(before!.x, target!.x) - 1)
      expect(during!.x).toBeLessThanOrEqual(Math.max(before!.x, target!.x) + 1)
      expect(Math.abs(during!.x - target!.x)).toBeGreaterThan(.5)
      expect(Math.abs(during!.x - before!.x)).toBeGreaterThan(.5)
      await aligned(page)
      expect(await nav.locator('.aww-nav-active-slider').evaluate(e => getComputedStyle(e).backgroundImage)).toContain('linear-gradient')
      if (width <= 860) {
        expect(await button.evaluate(e => getComputedStyle(e).backgroundColor)).toBe('rgba(0, 0, 0, 0)')
        expect(await button.evaluate(e => getComputedStyle(e).boxShadow)).toBe('none')
        expect(target!.height).toBeGreaterThanOrEqual(44)
      }
    }
    await page.keyboard.press('3')
    await expect(nav.getByRole('tab', { name: 'Progress' })).toBeFocused()
    await aligned(page)
    await nav.getByRole('tab', { name: 'Path' }).click()
    await aligned(page)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    if ([1280, 390].includes(width)) await page.screenshot({ path: `.agent-local/screens/learn-switcher/after-${width}-${theme}.png` })
  })
}

test('selected segment follows responsive resize in both directions', async ({ page }) => {
  await enter(page)
  await page.locator('.aww-nav-desktop').getByRole('tab', { name: 'Progress' }).click()
  await aligned(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await aligned(page)
  await expect(page.locator('.aww-nav-mobile').getByRole('tab', { name: 'Progress' })).toHaveAttribute('aria-selected', 'true')
  await page.setViewportSize({ width: 1280, height: 800 })
  await aligned(page)
})

test('reduced motion keeps the selected indicator aligned', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 390, height: 844 })
  await enter(page)
  const nav = page.locator('.aww-nav-mobile')
  await nav.getByRole('tab', { name: 'Progress' }).click()
  await aligned(page)
  expect(await nav.locator('.aww-nav-active-slider').evaluate(e => Number.parseFloat(getComputedStyle(e).transitionDuration))).toBeLessThanOrEqual(.001)
})

for (const width of [861, 390]) test(`author tab indicator fits ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: width > 860 ? 800 : 844 })
  await enter(page, 'dark', true)
  const nav = page.locator(width > 860 ? '.aww-nav-desktop' : '.aww-nav-mobile')
  await expect(nav.getByRole('tab')).toHaveCount(6)
  await nav.getByRole('tab', { name: 'Library', exact: true }).click()
  await aligned(page)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
