import { test, expect } from '@playwright/test'
import { openPracticeCategory, openPracticeSign, selectPractice } from './helpers/navigation'

for (const width of [360, 390, 903, 1280])
  for (const theme of ['light', 'dark']) {
    test(`Watch layout, help and category return at ${width}px in ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: width === 903 ? 532 : width < 700 ? 844 : 800 })
      await page.addInitScript((theme) => {
        sessionStorage.setItem('suvana.learn.entered', '1')
        localStorage.setItem('suvana.learn.onboarding-seen', '1')
        localStorage.setItem('suvana.learn.theme', theme)
        localStorage.setItem('suvana.theme', theme)
      }, theme)
      await page.goto('./')
      await selectPractice(page)
      await openPracticeCategory(page, 'Verbs')
      const sign = page.getByRole('button', { name: 'Watch ADINAWA (pull)', exact: true })
      await sign.click()
      await expect(page.locator('.practice-lesson-title h1')).toHaveText('pull')
      await expect(page.locator('.practice-lesson-title .practice-kicker')).toHaveCount(0)
      await expect(page.locator('.practice-watch-next .practice-kicker')).toHaveCount(0)
      await expect(page.locator('.practice-lesson-header')).not.toContainText('How it works')
      const stage = page.locator('.practice-reference-card .reference-stage')
      await expect(stage).toBeVisible()
      expect((await stage.boundingBox())!.height).toBeGreaterThanOrEqual(width < 700 ? 240 : 340)
      if (width !== 903)
        await expect(
          page
            .locator('.practice-reference-card')
            .getByRole('button', { name: 'Pause', exact: true }),
        ).toBeInViewport()
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
      const action = page.getByRole('button', { name: 'Try this sign', exact: true })
      await expect(action).toHaveText('Try')
      if (width < 700) {
        await expect(action).toBeInViewport()
        const button = await action.boundingBox()
        const dock = await page.locator('.aww-nav-mobile').boundingBox()
        expect(button!.y + button!.height).toBeLessThanOrEqual(dock!.y)
      }
      const help = page
        .locator('.practice-watch-next')
        .getByRole('button', { name: 'How it works', exact: true })
      await help.click()
      await expect(page.getByRole('dialog', { name: 'Frame yourself', exact: true })).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(help).toBeFocused()
      await page.getByRole('button', { name: 'Back to Verbs (Esc)', exact: true }).click()
      await expect(page.getByRole('heading', { name: 'Verbs', exact: true })).toBeVisible()
      await expect(sign).toBeFocused()
      await expect(sign).toBeInViewport()
      await sign.click()
      await page.keyboard.press('Escape')
      await expect(page.getByRole('heading', { name: 'Verbs', exact: true })).toBeVisible()

      // A search opened from Verbs can select another category; Back follows that sign.
      await openPracticeSign(page, 'BAG EKA')
      await page
        .getByRole('button', { name: 'Back to Additional words (Esc)', exact: true })
        .click()
      await expect(
        page.getByRole('heading', { name: 'Additional words', exact: true }),
      ).toBeVisible()
      await expect(
        page.getByRole('button', { name: 'Watch BAG EKA (bag)', exact: true }),
      ).toBeFocused()
    })
  }

test('direct sign entry and a folded category both return to the actual browser group', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('suvana.learn.onboarding-seen', '1'))
  await page.goto('./?sign=ADINAWA')
  await page.getByRole('button', { name: 'Back to Verbs (Esc)', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Verbs', exact: true })).toBeVisible()
  // The shipped Conjunctions reference is folded into Other in the picker.
  await openPracticeCategory(page, 'Other')
  const first = page.locator('.practice-sign-select').first()
  const name = await first.getAttribute('aria-label')
  await first.click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('heading', { name: 'Other', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: name!, exact: true })).toBeFocused()
})
