import { test, expect } from '@playwright/test'
import { openPracticeCategory, selectPractice } from './helpers/navigation'

for (const width of [360, 390, 903, 1280])
  for (const theme of ['light', 'dark']) {
    test(`sign cards and one global search at ${width}px in ${theme}`, async ({ page }) => {
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
      await expect(page.locator('.practice-sign')).toHaveCount(144)
      await expect(page.getByRole('button', { name: 'Find a sign', exact: true })).toHaveCount(1)
      await expect(page.locator('.practice-collection input')).toHaveCount(0)
      await expect(page.getByRole('heading', { name: 'Verbs', exact: true })).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)

      // Check the rendered colours and real targets, including phone footer fit.
      const cards = page.locator('.practice-sign')
      const tones = await cards.evaluateAll(
        (nodes) => new Set(nodes.map((node) => getComputedStyle(node).backgroundColor)).size,
      )
      expect(tones).toBe(4)
      for (let index = 0; index < (await cards.count()); index++) {
        const card = cards.nth(index)
        const bounds = await card.boundingBox()
        for (const button of await card.getByRole('button').all()) {
          const box = await button.boundingBox()
          expect(box!.width).toBeGreaterThanOrEqual(44)
          expect(box!.height).toBeGreaterThanOrEqual(44)
          expect(box!.x).toBeGreaterThanOrEqual(bounds!.x)
          expect(box!.x + box!.width).toBeLessThanOrEqual(bounds!.x + bounds!.width)
        }
        const title = card.locator('h3')
        expect(await title.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true)
      }

      // The browser resolves color-mix into native canvas pixels before measuring.
      // These spot checks cover each decorative tone, not a full accessibility audit.
      for (const tone of ['teal', 'gold', 'coral', 'iris']) {
        const ratios = await page
          .locator(`.practice-sign[data-tone="${tone}"]`)
          .first()
          .evaluate((card) => {
            const canvas = document.createElement('canvas')
            canvas.width = canvas.height = 1
            const context = canvas.getContext('2d')!
            const pixel = (color: string) => {
              context.clearRect(0, 0, 1, 1)
              context.fillStyle = color
              context.fillRect(0, 0, 1, 1)
              return Array.from(context.getImageData(0, 0, 1, 1).data)
            }
            const luminance = (color: number[]) =>
              color
                .slice(0, 3)
                .map((value) => {
                  value /= 255
                  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
                })
                .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0)
            return Array.from(
              card.querySelectorAll(
                'h3, .practice-sign-select span, .practice-sign-actions button',
              ),
            ).map((node) => {
              const layers = []
              let ancestor: Element | null = node
              while (ancestor) {
                layers.unshift(pixel(getComputedStyle(ancestor).backgroundColor))
                ancestor = ancestor.parentElement
              }
              let background = [0, 0, 0]
              for (const layer of layers)
                background = background.map(
                  (value, index) => (layer[index] * layer[3]) / 255 + value * (1 - layer[3] / 255),
                )
              const fg = luminance(pixel(getComputedStyle(node).color))
              const bg = luminance(background)
              return (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05)
            })
          })
        for (const ratio of ratios)
          expect(ratio, `${theme} ${tone} text`).toBeGreaterThanOrEqual(4.5)
      }

      await page.getByRole('button', { name: 'Find a sign', exact: true }).click()
      const search = page.getByRole('combobox', { name: 'Find a sign', exact: true })
      await search.fill('BAG EKA')
      await search.press('Enter')
      await expect(page.locator('.practice-gloss')).toHaveText('BAG EKA')
    })
  }
