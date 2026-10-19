import { test, expect, type Page } from '@playwright/test'
import { CURRICULUM_UNITS } from '../../../apps/learn/src/data/curriculum'

const total = CURRICULUM_UNITS.length + 1
const cards = (page: Page) => page.locator('.path-card')

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
  // Existing app-bar baseline at 320px is separate from Path layout.
  if (page.viewportSize()!.width >= 360) {
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  const bounds = await cards(page).evaluateAll(nodes => nodes.map(node => {
    const rect = node.getBoundingClientRect()
    return { width: rect.width, height: rect.height, fits: node.scrollHeight <= node.clientHeight + 1, radius: parseFloat(getComputedStyle(node).borderTopLeftRadius) }
  }))
  for (const rect of bounds) {
    expect(Math.abs(rect.width - bounds[0].width)).toBeLessThan(1)
    expect(rect.height).toBe(bounds[0].height)
    expect(rect.radius).toBeGreaterThanOrEqual(24)
    expect(rect.fits).toBe(true)
  }
  await expect(page.getByRole('navigation', { name: 'Lesson pages' })).toHaveCount(0)
  await expect(page.locator('.path-route path').last()).not.toHaveAttribute('d', '')
  // Test actual SVG/card boundary intersections, independently of the path commands.
  expect(await page.locator('.path-map-canvas').evaluate(canvas => {
    const bounds = canvas.getBoundingClientRect()
    const path = canvas.querySelector('path:last-child') as SVGPathElement
    const length = path.getTotalLength(), count = Math.ceil(length / 4)
    const points = Array.from({ length: count + 1 }, (_, i) => path.getPointAtLength(length * i / count))
    const failures: string[] = []
    if (points.some(point => point.x < -1 || point.x > bounds.width + 1)) failures.push('route outside canvas')
    const nodes = [...canvas.querySelectorAll('.path-card')]
    for (const [index, node] of nodes.entries()) {
      const rect = node.getBoundingClientRect()
      const left = rect.left - bounds.left, right = rect.right - bounds.left
      const top = rect.top - bounds.top, bottom = rect.bottom - bounds.top, centre = (top + bottom) / 2
      const inside = (point: DOMPoint) => point.x > left && point.x < right && point.y > top && point.y < bottom
      let wasInside = inside(points[0]), crossings = 0
      for (const point of points.slice(1)) {
        const isInside = inside(point)
        if (isInside !== wasInside) {
          crossings++
          if (Math.abs(point.y - centre) > 3) failures.push(`lesson ${index + 1} boundary away from mid-height`)
        }
        wasInside = isInside
      }
      if (crossings !== (index === 0 || index === nodes.length - 1 ? 1 : 2)) failures.push(`lesson ${index + 1} crossed ${crossings} times`)
    }
    return failures
  })).toEqual([])
}

for (const theme of ['light', 'dark']) {
  for (const width of [900, 1024, 1280, 1440]) {
    test(`desktop is continuous with nine lessons per viewport at ${width}px in ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      await enter(page, theme)
      await expect(cards(page)).toHaveCount(total)
      await assertFit(page)
      expect((await cards(page).locator('.path-number').allTextContents()).map(Number))
        .toEqual(Array.from({ length: total }, (_, i) => i + 1))
      const positions = await cards(page).evaluateAll(nodes => nodes.map(node => {
        const rect = node.getBoundingClientRect()
        return { x: rect.x, y: rect.y }
      }))
      const pitch = positions[3].y - positions[0].y
      for (let i = 0; i < positions.length; i++) {
        const row = Math.floor(i / 3), column = row % 2 === 0 ? i % 3 : 2 - i % 3
        expect(Math.abs(positions[i].x - positions[column].x)).toBeLessThan(1)
        if (i >= 3) expect(Math.abs(positions[i].y - positions[i - 3].y - pitch)).toBeLessThan(1)
      }
      for (let start = 0; start < total; start += 9) {
        await cards(page).nth(start).evaluate(node => {
          const header = document.querySelector('.aww-app-bar')!.getBoundingClientRect().height
          window.scrollTo(0, node.getBoundingClientRect().top + scrollY - header - 32)
        })
        await expect.poll(() => cards(page).evaluateAll(nodes => nodes.filter(node => {
          const rect = node.getBoundingClientRect(), header = document.querySelector('.aww-app-bar')!.getBoundingClientRect().bottom
          return rect.bottom > header && rect.top < innerHeight
        }).map(node => Number(node.querySelector('.path-number')!.textContent))))
          .toEqual(Array.from({ length: Math.min(9, total - start) }, (_, i) => start + i + 1))
      }
      await expect(page.locator('.sentence-entry')).toContainText('not calibrated')
      await expect(page.locator('.sentence-entry')).toBeDisabled()
    })
  }

  for (const width of [320, 360, 390, 768, 899]) {
    test(`mobile route reserves outside curve gutters at ${width}px in ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 })
      await enter(page, theme)
      await expect(cards(page)).toHaveCount(total)
      await assertFit(page)
      const boxes = await cards(page).evaluateAll(nodes => nodes.map(node => {
        const rect = node.getBoundingClientRect(), parent = node.closest('.path-map-canvas')!.getBoundingClientRect()
        return { x: rect.x, y: rect.y, leftGutter: rect.left - parent.left, rightGutter: parent.right - rect.right }
      }))
      for (let i = 0; i < boxes.length; i++) {
        expect(boxes[i].leftGutter).toBeGreaterThanOrEqual(23)
        expect(boxes[i].rightGutter).toBeGreaterThanOrEqual(23)
        expect(boxes[i].x).toBe(i % 2 === 0 ? boxes[0].x : boxes[1].x)
        if (i > 0) expect(boxes[i].y).toBeGreaterThan(boxes[i - 1].y)
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

test('keyboard reaches later lessons and return restores focus across responsive resize', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await enter(page)
  await cards(page).first().focus()
  for (let i = 0; i < 9; i++) await page.keyboard.press('Tab')
  await expect(cards(page).nth(9)).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: 'Practise this unit', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Back to path' }).click()
  await expect(cards(page).nth(9)).toBeFocused()
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(cards(page)).toHaveCount(total)
  await assertFit(page)
  await cards(page).nth(total - 2).click()
  await page.getByRole('button', { name: 'Back to path' }).click()
  await expect(cards(page).nth(total - 2)).toBeFocused()
  await page.setViewportSize({ width: 1280, height: 800 })
  await expect(cards(page)).toHaveCount(total)
  await assertFit(page)
})

for (const height of [720, 900, 1080]) {
  test(`desktop viewport density adapts to ${height}px height`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height })
    await enter(page)
    for (const start of [0, 9]) {
      await cards(page).nth(start).evaluate(node => {
        const h = document.querySelector('.aww-app-bar')!.getBoundingClientRect().height
        window.scrollTo(0, node.getBoundingClientRect().top + scrollY - h - 32)
      })
      await expect.poll(() => cards(page).evaluateAll(nodes => nodes.filter(node => {
        const rect = node.getBoundingClientRect(), h = document.querySelector('.aww-app-bar')!.getBoundingClientRect().bottom
        return rect.bottom > h && rect.top < innerHeight
      }).map(node => Number(node.querySelector('.path-number')!.textContent))))
        .toEqual(Array.from({ length: 9 }, (_, i) => start + i + 1))
    }
    await expect(cards(page)).toHaveCount(total)
  })
}
