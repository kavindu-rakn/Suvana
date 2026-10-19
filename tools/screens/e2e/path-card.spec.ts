import { test, expect, type Page } from '@playwright/test'
import { CURRICULUM_UNITS } from '../../../apps/learn/src/data/curriculum'

async function enter(page: Page, theme = 'light') {
  await page.addInitScript(theme => {
    sessionStorage.setItem('suvana.learn.entered', '1')
    localStorage.setItem('suvana.learn.onboarding-seen', '1')
    localStorage.setItem('suvana.theme', theme)
  }, theme)
  await page.goto('./')
  await page.getByRole('tab', { name: /Path/ }).first().click()
  await expect(page.locator('.path-card').first()).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
}

async function assertCardContents(page: Page) {
  expect(await page.locator('.path-card-copy > strong').allTextContents())
    .toEqual([...CURRICULUM_UNITS.map(unit => unit.title), 'Sentence challenge'])
  const failures = await page.locator('.path-card').evaluateAll(nodes => {
    const failures: string[] = []
    const centre = (r: DOMRect) => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 })
    for (const [index, node] of nodes.entries()) {
      const card = node.getBoundingClientRect(), slot = node.closest('.path-node')!.getBoundingClientRect()
      const title = node.querySelector('.path-card-copy > strong')!, titleBounds = title.getBoundingClientRect()
      const cardCentre = centre(card), slotCentre = centre(slot)
      if (card.height !== 124 || Math.abs(slot.width - card.width - 44) > 1) failures.push(`${index}: dimensions`)
      if (Math.abs(cardCentre.x - slotCentre.x) > .5 || Math.abs(cardCentre.y - slotCentre.y) > .5) failures.push(`${index}: slot centre`)
      const heading = node.querySelector('.path-card-heading')!.getBoundingClientRect()
      if (titleBounds.top < heading.bottom || titleBounds.left < card.left + 12) failures.push(`${index}: title overlaps header`)
      const range = document.createRange()
      range.selectNodeContents(title)
      for (const rect of range.getClientRects()) {
        if (rect.left < card.left + 5 || rect.right > card.right - 5 || rect.top < card.top || rect.bottom > card.bottom) failures.push(`${index}: title text clipped`)
      }
      const meta = node.querySelector('.path-card-meta')!, metaBounds = meta.getBoundingClientRect()
      if (metaBounds.top < titleBounds.bottom + 3 || metaBounds.bottom > card.bottom - 6) failures.push(`${index}: metadata fit`)
      const milestone = node.querySelector('.lesson-stars')
      if (milestone && Math.abs(centre(milestone.getBoundingClientRect()).y - centre(heading).y) > .5) failures.push(`${index}: milestone header alignment`)
      const count = node.querySelector('.path-star-count')
      if (count) {
        const countBounds = count.getBoundingClientRect()
        if (Math.abs(countBounds.right - metaBounds.right) > .5) failures.push(`${index}: right alignment`)
        const star = count.querySelector('svg')!
        if (getComputedStyle(star).fill !== 'rgb(250, 204, 21)') failures.push(`${index}: yellow star`)
        if (/stars/i.test(count.textContent ?? '')) failures.push(`${index}: visible stars word`)
      }
      if (node.scrollHeight > node.clientHeight + 1) failures.push(`${index}: card overflow`)
    }
    return failures
  })
  expect(failures).toEqual([])
  expect(await page.locator('.path-card:not(.sentence-entry) .path-card-meta > span:first-child').allTextContents())
    .toEqual(CURRICULUM_UNITS.map(unit => `${unit.signs.length} signs`))
  expect(await page.locator('.path-star-count').evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label'))))
    .toEqual(CURRICULUM_UNITS.map(unit => `0 of ${unit.signs.length * 3} stars`))
}

for (const theme of ['light', 'dark']) {
  for (const width of [320, 360, 390, 900, 1280]) {
    test(`compact lesson content fits every title at ${width}px in ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: width >= 900 ? 800 : 844 })
      await enter(page, theme)
      await assertCardContents(page)
    })
  }
}

test('compact mobile cards keep partial-reference and experimental notices readable', async ({ page }) => {
  // Synthetic missing-reference fixture from the actual index; UI evidence only.
  await page.route('**/reference-index.json*', async route => {
    const response = await route.fetch()
    const index = await response.json()
    index.recordings = index.recordings.filter((recording: { gloss: string }) => recording.gloss !== CURRICULUM_UNITS[0].signs[0])
    await route.fulfill({ response, json: index })
  })
  await page.setViewportSize({ width: 320, height: 844 })
  await enter(page)
  await expect(page.locator('.path-card').first()).toHaveAttribute('data-state', 'preview')
  await expect(page.locator('.path-card').first().locator('.path-card-notice')).toContainText('Preview:')
  await assertCardContents(page)
  await expect(page.locator('.sentence-entry .path-card-notice')).toContainText('not calibrated')
})
