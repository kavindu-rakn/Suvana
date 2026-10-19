import { test, expect } from '@playwright/test'
import { selectPractice } from './helpers/navigation'

for (const width of [360, 390, 903, 1280])
  for (const theme of ['light', 'dark']) {
    test(`Spotlight keyboard flow and browser layout at ${width}px in ${theme}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: width === 903 ? 532 : width < 700 ? 844 : 800 })
      await page.addInitScript((theme) => {
        sessionStorage.setItem('suvana.learn.entered', '1')
        localStorage.setItem('suvana.learn.onboarding-seen', '1')
        localStorage.setItem('suvana.theme', theme)
        localStorage.setItem('suvana.learn.theme', theme)
      }, theme)
      await page.goto('./')
      await selectPractice(page)
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
      await expect(
        page.locator('.practice-welcome, .practice-pick, .practice-browser-note'),
      ).toHaveCount(0)
      const trigger = page.getByRole('button', { name: 'Find a sign', exact: true })
      const bounds = await trigger.boundingBox()
      const header = await page.locator('.aww-app-bar').boundingBox()
      expect(bounds!.y).toBeGreaterThanOrEqual(header!.y + header!.height)
      expect(Math.abs(bounds!.x + bounds!.width / 2 - width / 2)).toBeLessThan(1)
      expect(bounds!.width).toBe(width < 700 ? width - 36 : 360)
      const heading = await page.getByRole('heading', { name: 'Explore the signs' }).boundingBox()
      const totals = await page.locator('.practice-collection-totals').boundingBox()
      expect(
        Math.abs(heading!.y + heading!.height / 2 - totals!.y - totals!.height / 2),
      ).toBeLessThan(2)
      expect(
        await page
          .locator('.practice-collection-totals strong')
          .first()
          .evaluate((node) => getComputedStyle(node).backgroundImage),
      ).toContain('linear-gradient')
      expect(
        await page
          .locator('.practice-category')
          .evaluateAll(
            (nodes) => new Set(nodes.map((node) => getComputedStyle(node).borderColor)).size,
          ),
      ).toBe(4)
      await trigger.focus()
      await page.keyboard.press('/')
      const dialog = page.getByRole('dialog', { name: 'Find a sign', exact: true })
      const search = dialog.getByRole('combobox', { name: 'Find a sign', exact: true })
      await expect(search).toBeFocused()
      await search.fill('B')
      const options = dialog.getByRole('option')
      await expect(options).toHaveCount(10)
      await expect(options.first()).toHaveAttribute('aria-selected', 'true')
      await search.press('ArrowUp')
      await expect(options.last()).toHaveAttribute('aria-selected', 'true')
      await expect(options.last()).toBeInViewport()
      await search.press('ArrowDown')
      await expect(options.first()).toHaveAttribute('aria-selected', 'true')
      await expect(options.first()).toBeInViewport()
      await expect(search).toBeFocused()
      await search.fill('no-such-gloss-spotlight')
      await expect(options).toHaveCount(0)
      await search.press('Enter')
      await expect(dialog).toBeVisible()
      await search.press('Escape')
      await expect(dialog).not.toBeVisible()
      await expect(trigger).toBeFocused()
      await trigger.click()
      await search.fill('BAG EKA')
      await expect(options).toHaveCount(1)
      await search.press('Tab')
      await expect(dialog.getByRole('button', { name: 'Close search', exact: true })).toBeFocused()
      await search.focus()
      const box = await dialog.boundingBox()
      expect(box!.x).toBeGreaterThanOrEqual(0)
      expect(box!.x + box!.width).toBeLessThanOrEqual(width)
      expect(box!.y + box!.height).toBeLessThanOrEqual(
        width === 903 ? 532 : width < 700 ? 844 : 800,
      )
      await search.press('Enter')
      await expect(dialog).not.toBeVisible()
      await expect(page.locator('.practice-lesson-title h1')).toBeFocused()
      await expect(page.locator('.practice-gloss')).toHaveText('BAG EKA')
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
    })
  }

test('search ignores text entry and other open dialogs, and closes on the backdrop', async ({
  page,
}) => {
  await page.addInitScript(() => {
    sessionStorage.setItem('suvana.learn.entered', '1')
    localStorage.setItem('suvana.learn.onboarding-seen', '1')
  })
  await page.goto('./')
  await selectPractice(page)
  await page.locator('.practice-category').filter({ hasText: 'Additional words' }).click()
  const scoped = page.getByRole('searchbox', {
    name: 'Search within Additional words',
    exact: true,
  })
  await scoped.fill('BAG')
  await scoped.press('/')
  await expect(scoped).toHaveValue('BAG/')
  await expect(page.getByRole('dialog', { name: 'Find a sign', exact: true })).not.toBeVisible()
  await scoped.fill('BAG EKA')
  await page.getByRole('button', { name: /^Preview BAG EKA/ }).click()
  await page.getByRole('button', { name: 'Close preview', exact: true }).focus()
  await page.keyboard.press('/')
  await expect(page.getByRole('dialog', { name: 'Sign preview', exact: true })).toBeVisible()
  await expect(page.getByRole('dialog', { name: 'Find a sign', exact: true })).not.toBeVisible()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Find a sign', exact: true }).click()
  await page.mouse.click(4, 4)
  await expect(page.getByRole('dialog', { name: 'Find a sign', exact: true })).not.toBeVisible()
})

test('a touch result opens Watch without a second tap', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const page = await context.newPage()
  await page.addInitScript(() => {
    sessionStorage.setItem('suvana.learn.entered', '1')
    localStorage.setItem('suvana.learn.onboarding-seen', '1')
  })
  await page.goto('./')
  await selectPractice(page)
  await page.getByRole('button', { name: 'Find a sign', exact: true }).tap()
  await page.getByRole('combobox', { name: 'Find a sign', exact: true }).fill('BAG EKA')
  await page.getByRole('option').tap()
  await expect(page.getByRole('dialog', { name: 'Find a sign', exact: true })).not.toBeVisible()
  await expect(page.locator('.practice-lesson-title h1')).toBeFocused()
  await expect(page.locator('.practice-gloss')).toHaveText('BAG EKA')
  await context.close()
})

test('the mobile search panel follows a keyboard-sized visible viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.addInitScript(() => {
    sessionStorage.setItem('suvana.learn.entered', '1')
    localStorage.setItem('suvana.learn.onboarding-seen', '1')
    const viewport = new EventTarget() as EventTarget & { height: number; offsetTop: number }
    viewport.height = 400
    viewport.offsetTop = 0
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport })
  })
  await page.goto('./')
  await selectPractice(page)
  await page.getByRole('button', { name: 'Find a sign', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Find a sign', exact: true })
  const search = page.getByRole('combobox', { name: 'Find a sign', exact: true })
  await search.fill('B')
  await search.press('ArrowUp')
  const box = await dialog.boundingBox()
  expect(box!.y + box!.height).toBeLessThanOrEqual(400)
  await expect(page.getByRole('option').last()).toBeInViewport()
  await page.evaluate(() => {
    const viewport = window.visualViewport as unknown as { offsetTop: number; dispatchEvent: (event: Event) => void }
    viewport.offsetTop = 80
    viewport.dispatchEvent(new Event('scroll'))
  })
  expect((await dialog.boundingBox())!.y).toBe(128)
})
