import { test, expect, type Page } from '@playwright/test'
import { CURRICULUM_UNITS } from '../../../apps/learn/src/data/curriculum'

const total = CURRICULUM_UNITS.length + 1
const cards = (page: Page) => page.locator('.path-card:visible')

async function enter(page: Page, theme = 'light') {
  await page.addInitScript(theme => {
    sessionStorage.setItem('suvana.learn.entered', '1')
    localStorage.setItem('suvana.learn.onboarding-seen', '1')
    localStorage.setItem('suvana.theme', theme)
  }, theme)
  await page.goto('./')
  await page.getByRole('tab', { name: /Path/ }).first().click()
  await expect(cards(page).first()).toBeVisible()
}

async function assertFit(page: Page) {
  expect(await page.locator('.path-view').evaluate(node => {
    const rect = node.getBoundingClientRect()
    return rect.left >= 0 && rect.right <= innerWidth && node.scrollWidth <= node.clientWidth
  })).toBe(true)
  // The existing app bar is 332px wide at 320px. Keep that unrelated baseline
  // separate from the Path's fit, and enforce full-page fit at supported phones.
  if (page.viewportSize()!.width >= 360) {
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  const bounds = await cards(page).evaluateAll(nodes => nodes.map(node => {
    const rect = node.getBoundingClientRect()
    return { width: rect.width, height: rect.height, fits: node.scrollHeight <= node.clientHeight + 1 }
  }))
  for (const rect of bounds) {
    expect(Math.abs(rect.width - bounds[0].width)).toBeLessThan(1)
    expect(rect.height).toBe(bounds[0].height)
    expect(rect.fits).toBe(true)
  }
  await expect(page.locator('.path-route path').last()).not.toHaveAttribute('d', '')
  expect(await page.locator('.path-route path').last().evaluate(node => {
    const path = node as SVGPathElement, width = path.ownerSVGElement!.viewBox.baseVal.width
    const length = path.getTotalLength()
    return Array.from({ length: 101 }, (_, i) => path.getPointAtLength(length * i / 100))
      .every(point => point.x >= -1 && point.x <= width + 1)
  })).toBe(true)
}

for (const theme of ['light', 'dark']) {
  for (const width of [900, 1024, 1280, 1440]) {
  test(`desktop pages preserve lesson order, equal cards and mirrored S at ${width}px in ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })
    await enter(page, theme)
    const found: number[] = []
    for (let current = 0; current < Math.ceil(total / 9); current++) {
      await expect(cards(page)).toHaveCount(Math.min(9, total - current * 9))
      const numbers = await cards(page).locator('.path-number').allTextContents()
      found.push(...numbers.map(Number))
      await assertFit(page)
      const positions = await cards(page).evaluateAll(nodes => nodes.map(node => {
        const rect = node.getBoundingClientRect()
        return { x: rect.x, y: rect.y, bottom: rect.bottom }
      }))
      expect(positions.every(rect => rect.bottom < 800)).toBe(true)
      if (positions.length === 9) {
        expect(positions[0].x).toBeLessThan(positions[1].x)
        expect(positions[1].x).toBeLessThan(positions[2].x)
        expect(positions[3].x).toBe(positions[2].x)
        expect(positions[3].x).toBeGreaterThan(positions[4].x)
        expect(positions[4].x).toBeGreaterThan(positions[5].x)
        expect(positions[6].x).toBe(positions[5].x)
      }
      if ((current + 1) * 9 < total) await page.getByRole('button', { name: 'Next', exact: true }).click()
    }
    expect(found).toEqual(Array.from({ length: total }, (_, i) => i + 1))
    await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeDisabled()
    await expect(page.locator('.sentence-entry')).toContainText('not calibrated')
    await expect(page.locator('.sentence-entry')).toBeDisabled()
  })
  }

  for (const width of [320, 360, 390, 768, 899]) {
    test(`mobile route alternates every lesson without pagination at ${width}px in ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 })
      await enter(page, theme)
      await expect(cards(page)).toHaveCount(total)
      await expect(page.getByRole('navigation', { name: 'Lesson pages' })).toBeHidden()
      await assertFit(page)
      const boxes = await cards(page).evaluateAll(nodes => nodes.map(node => {
        const rect = node.getBoundingClientRect()
        return { x: rect.x, y: rect.y }
      }))
      for (let i = 1; i < boxes.length; i++) {
        expect(boxes[i].y).toBeGreaterThan(boxes[i - 1].y)
        expect(boxes[i].x).toBe(i % 2 === 0 ? boxes[0].x : boxes[1].x)
      }
      expect(boxes[0].x).toBeLessThan(boxes[1].x)
      for (const index of [0, 1, total - 2]) {
        const card = cards(page).nth(index)
        await card.scrollIntoViewIfNeeded()
        expect(await card.evaluate(node => {
          const rect = node.getBoundingClientRect()
          return node.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2))
        })).toBe(true)
      }
    })
  }
}

test('keyboard pagination and lesson return retain the desktop page across resize', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await enter(page)
  const next = page.getByRole('button', { name: 'Next', exact: true })
  await cards(page).first().focus()
  for (let i = 0; i < 9; i++) await page.keyboard.press('Tab')
  await expect(next).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(cards(page).first().locator('.path-number')).toHaveText('10')
  await cards(page).first().click()
  await expect(page.getByRole('button', { name: 'Practise this unit', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Back to path' }).click()
  await expect(cards(page).first().locator('.path-number')).toHaveText('10')
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(cards(page)).toHaveCount(total)
  await assertFit(page)
  await page.setViewportSize({ width: 1280, height: 800 })
  await expect(cards(page)).toHaveCount(9)
  await expect(cards(page).first().locator('.path-number')).toHaveText('10')
  await assertFit(page)
})
