import { test, expect } from '@playwright/test'
import { filterPracticeSigns, selectPractice } from './helpers/navigation'

// No learner results are seeded here. Existing camera/replay specs use
// disclosed synthetic fixtures; these cases check layout and navigation.
for (const width of [360, 390, 768, 1280])
  for (const theme of ['light', 'dark']) {
    test(`Practice browse / watch / try / preview at ${width}px in ${theme}`, async ({
      browser,
      baseURL,
    }) => {
      const context = await browser.newContext({
        baseURL,
        viewport: { width, height: width < 700 ? 844 : 800 },
        isMobile: width < 700,
        hasTouch: width < 700,
        reducedMotion: 'reduce',
      })
      const page = await context.newPage()
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))
      await page.addInitScript((theme) => {
        sessionStorage.setItem('suvana.learn.entered', '1')
        localStorage.setItem('suvana.learn.onboarding-seen', '1')
        localStorage.setItem('suvana.learn.theme', theme)
        localStorage.setItem('suvana.theme', theme)
      }, theme)
      await page.goto('./')
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
      await selectPractice(page)
      await expect(page.getByRole('heading', { name: 'Explore the signs' })).toBeVisible()
      await expect(page.locator('.practice-category').first()).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
      await page.locator('.practice-category').first().click()
      await expect(page.locator('.practice-sign').first()).toBeVisible()
      await page.getByRole('button', { name: 'Back to all categories', exact: true }).click()
      await page.getByRole('button', { name: 'Find a sign', exact: true }).click()
      const search = page.getByRole('combobox', { name: 'Find a sign', exact: true })
      await search.fill('zz-no-matching-sign-zz')
      await expect(page.getByRole('dialog', { name: 'Find a sign', exact: true })).toContainText(
        'No signs found.',
      )
      await search.fill('BAG EKA')
      await expect(page.getByRole('option')).toHaveCount(1)
      await search.press('Escape')
      await filterPracticeSigns(page)
      const preview = page.getByRole('button', { name: /^Preview BAG EKA/ }).first()
      await preview.click()
      const dialog = page.getByRole('dialog', { name: 'Sign preview', exact: true })
      await expect(dialog).toBeVisible()
      await expect(dialog.locator('.reference-canvas')).toBeVisible()
      const box = await dialog.boundingBox()
      expect(box!.x).toBeGreaterThanOrEqual(0)
      expect(box!.x + box!.width).toBeLessThanOrEqual(width)
      await page.keyboard.press('1')
      await expect(dialog).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(dialog).not.toBeVisible()
      await expect(preview).toBeFocused()
      await preview.click()
      await page.getByRole('button', { name: 'Watch this sign', exact: true }).click()
      await expect(page.locator('.practice-lesson-title h1')).toBeFocused()
      const next = page.getByRole('button', { name: 'My turn', exact: true })
      await expect(next).toBeEnabled()
      await expect(next).toBeInViewport()
      if (width < 700) {
        const action = await next.boundingBox()
        const nav = await page.locator('.aww-nav-mobile').boundingBox()
        expect(action!.y + action!.height).toBeLessThanOrEqual(nav!.y)
      }

      await next.click()
      await expect(page.getByRole('button', { name: 'Turn on camera', exact: true })).toBeVisible()
      if (width < 700) {
        await expect(page.locator('.practice-reference-card .reference-canvas')).not.toBeVisible()
        await page.getByRole('button', { name: 'Show reference', exact: true }).click()
        await expect(page.locator('.practice-reference-card .reference-canvas')).toBeVisible()
      }
      await expect(page.getByRole('button', { name: 'Recall', exact: true })).toBeDisabled()
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
      await page.getByRole('button', { name: 'Choose a different sign (Esc)', exact: true }).click()
      await expect(page.getByRole('heading', { name: 'Explore the signs' })).toBeVisible()
      expect(errors).toEqual([])
      await context.close()
    })
  }

test('a failed preview can be closed and loaded again', async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem('suvana.learn.entered', '1')
    localStorage.setItem('suvana.learn.onboarding-seen', '1')
  })
  await page.route('**/references/kaggle_BAG_EKA.json*', (route) =>
    route.fulfill({ status: 503, body: 'Unavailable' }),
  )
  await page.goto('./')
  await selectPractice(page)
  await filterPracticeSigns(page)
  await page.getByRole('button', { name: /^Preview BAG EKA/ }).click()
  await expect(page.getByRole('dialog')).toContainText('Could not load this preview.')
  await page.getByRole('button', { name: 'Close preview', exact: true }).click()
  await page.unroute('**/references/kaggle_BAG_EKA.json*')
  await page.getByRole('button', { name: /^Preview BAG EKA/ }).click()
  await expect(page.getByRole('dialog').locator('.reference-canvas')).toBeVisible()
  await page.getByRole('button', { name: 'Watch this sign', exact: true }).click()
  await expect(page.getByRole('button', { name: 'My turn', exact: true })).toBeEnabled()
})
