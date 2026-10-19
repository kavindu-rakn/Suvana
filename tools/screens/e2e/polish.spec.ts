import { test, expect, type Page } from '@playwright/test'
import { mockHandDetectionScript } from './helpers/hands'
import { selectPractice, startFirstLesson } from './helpers/navigation'
import { CURRICULUM_UNITS } from '../../../apps/learn/src/data/curriculum'

async function fits(page: Page, width: number) {
  expect(await page.evaluate(() => ({ viewport: innerWidth, page: document.documentElement.scrollWidth }))).toEqual({ viewport: width, page: width })
}
async function enter(page: Page) {
  await page.addInitScript(() => localStorage.setItem('suvana.learn.onboarding-seen', '1'))
  await page.goto('./')
  await startFirstLesson(page)
  await expect(page.getByRole('button', { name: 'My turn', exact: true })).toBeEnabled()
}
async function tab(page: Page, name: string) {
  await page.getByRole('tab', { name: new RegExp('^' + name) }).filter({ visible: true }).click()
}
for (const width of [360, 375, 390]) {
  test(`touch preview and shipped screens fit ${width}px`, async ({ browser }) => {
    test.setTimeout(60000)
    const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' })
    const page = await context.newPage()
    await page.addInitScript(() => localStorage.setItem('suvana.learn.onboarding-seen', '1'))
    await page.goto('./'); await fits(page, width)
    await startFirstLesson(page)
    await expect(page.getByRole('button', { name: 'My turn', exact: true })).toBeEnabled()
    await fits(page, width)
    const reference = await page.locator('.practice-reference-card canvas').boundingBox()
    const title = await page.locator('.practice-reference-card .practice-card-heading').boundingBox()
    expect(title!.y + title!.height).toBeLessThanOrEqual(reference!.y)
    await page.getByRole('button', { name: 'My turn', exact: true }).click()
    await page.getByRole('button', { name: 'Turn on camera', exact: true }).scrollIntoViewIfNeeded()
    const cameraButton = await page.getByRole('button', { name: 'Turn on camera', exact: true }).boundingBox()
    const dock = await page.locator('.aww-nav-mobile').boundingBox()
    expect(cameraButton!.y + cameraButton!.height).toBeLessThan(dock!.y)
    await fits(page, width)
    await page.getByRole('button', { name: 'Choose a different sign (Esc)', exact: true }).click()
    await page.getByRole('searchbox', { name: 'Search all signs', exact: true }).fill('BAG EKA')
    const card = page.getByRole('button', { name: /^Preview / }).first()
    await card.tap()
    await expect(page.locator('.practice-is-browsing')).toHaveAttribute('data-preview', 'open')
    await expect(page.locator('.practice-preview-dialog canvas')).toBeVisible()
    await fits(page, width)
    await page.getByRole('button', { name: 'Close preview', exact: true }).click()
    await expect(page.locator('.practice-is-browsing')).toHaveAttribute('data-preview', 'closed')
    await card.tap(); await expect(page.locator('.practice-is-browsing')).toHaveAttribute('data-preview', 'open')
    await page.getByRole('button', { name: 'Watch this sign', exact: true }).click(); await expect(page.locator('.aww-practice-env')).toHaveAttribute('data-stage', 'watch')
    await tab(page, 'Path'); await expect(page.locator('.path-card').first()).toBeVisible(); await fits(page, width)
    await page.locator('.path-card').first().click(); await fits(page, width)
    await tab(page, 'Progress'); await expect(page.locator('.pg-game-stats')).toBeVisible(); await fits(page, width)
    await tab(page, 'Scenario'); await expect(page.locator('.aww-scenario-card').first()).toBeVisible(); await fits(page, width)
    await page.locator('button.aww-scenario-card').first().click(); await fits(page, width)
    await page.getByRole('button', { name: /Start Scenario|Start Preview/ }).click(); await fits(page, width)
    await page.goto('./?mode=author')
    await selectPractice(page)
    await expect(page.locator('.aww-practice-env')).toBeVisible()
    await fits(page, width)
    await tab(page, 'Library'); await expect(page.locator('.rec-list')).toBeVisible(); await fits(page, width)
    await tab(page, 'Record'); await expect(page.locator('.aww-studio-env')).toBeVisible(); await fits(page, width)
    await page.getByRole('button', { name: 'Turn on camera', exact: true }).scrollIntoViewIfNeeded()
    const studioButton = await page.getByRole('button', { name: 'Turn on camera', exact: true }).boundingBox()
    expect(studioButton!.y + studioButton!.height).toBeLessThan(dock!.y)
    const studioTitle = await page.locator('.aww-studio-env .aww-pane-right .aww-pane-header').boundingBox()
    const studioIntro = await page.locator('.aww-camera-intro').boundingBox()
    expect(studioTitle!.y + studioTitle!.height).toBeLessThanOrEqual(studioIntro!.y)
    await tab(page, 'Study'); await expect(page.getByRole('heading', { name: 'Study session', exact: true })).toBeVisible(); await fits(page, width)
    await context.close()
  })
}

test('desktop author tabs stay between the brand and utility controls', async ({ page }) => {
  await page.addInitScript(() => { sessionStorage.setItem('suvana.learn.entered', '1'); localStorage.setItem('suvana.learn.onboarding-seen', '1') })
  await page.goto('./?mode=author')
  for (const width of [861, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 800 })
    const brand = await page.locator('.aww-app-brand').boundingBox()
    const actions = await page.locator('.aww-app-actions').boundingBox()
    const tabs = await page.locator('.aww-nav-desktop .aww-nav-tab').evaluateAll(nodes => nodes.map(node => { const r = node.getBoundingClientRect(); return { left: r.left, right: r.right } }))
    expect(tabs[0].left).toBeGreaterThanOrEqual(brand!.x + brand!.width)
    expect(tabs.at(-1)!.right).toBeLessThanOrEqual(actions!.x)
    await fits(page, width)
  }
})

test('keyboard opens a sign once and reduced motion removes animation delays', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await enter(page)
  await page.getByRole('button', { name: 'Choose a different sign (Esc)', exact: true }).click()
  await page.getByRole('searchbox', { name: 'Search all signs', exact: true }).fill('BAG EKA')
  const card = page.getByRole('button', { name: /^Watch BAG EKA/ }).first()
  await card.focus()
  expect(await card.evaluate(el => getComputedStyle(el).animationDelay)).toBe('0s')
  await card.press('Space')
  await expect(page.locator('.aww-practice-env')).toHaveAttribute('data-stage', 'watch')
  await expect(page.getByRole('button', { name: 'My turn', exact: true })).toBeVisible()
})

for (const [empty, width] of [[false, 360], [false, 375], [false, 390], [true, 360]] as const) {
  test(`result at ${width}px starts at its heading and ${empty ? 'no-hands has plain tips' : 'Tab reaches replay before retry'}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 }); await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.addInitScript(mockHandDetectionScript)
    await page.addInitScript(() => { (window as unknown as { __mockHands: boolean }).__mockHands = true })
    await enter(page); await page.getByRole('button', { name: 'My turn', exact: true }).click()
    await page.getByRole('button', { name: 'Turn on camera', exact: true }).click()
    await expect(page.locator('#aww-hands-pill')).toHaveAttribute('data-ready', 'yes', { timeout: 20000 })
    await page.getByRole('button', { name: 'Record attempt (Space)', exact: true }).click()
    if (empty) await page.evaluate(() => Object.defineProperty(Object.prototype, 'detectForVideo', { configurable: true, get: () => () => ({ landmarks: [], worldLandmarks: [], handedness: [] }), set: () => {} }))
    await expect(page.locator('.practice-capture-controls button[aria-label="Stop and score (Space)"]')).toBeVisible()
    await page.waitForTimeout(350); await page.locator('.practice-capture-controls button[aria-label="Stop and score (Space)"]').click()
    const heading = page.getByRole('heading', { name: empty ? "Couldn't see your hands" : 'Your try, side by side.', exact: true })
    await expect(heading).toBeFocused()
    await expect(heading).toBeInViewport()
    if (empty) {
      await expect(page.locator('.aww-diag-icon')).toHaveCount(0)
      await expect(page.getByText('Keep a light in front of you.', { exact: true })).toBeVisible()
    } else {
      await page.keyboard.press('Tab'); await expect(page.locator('.replay-controls button').first()).toBeFocused()
    }
    await fits(page, width)
  })
}

test('Recall, reveal and session complete fit every phone width', async ({ page }) => {
  test.setTimeout(60000)
  await enter(page)
  await page.evaluate(() => new Promise<void>(resolve => {
    const req = indexedDB.open('ssl-learn', 3)
    req.onsuccess = () => {
      const db = req.result, tx = db.transaction('attempts', 'readwrite')
      tx.objectStore('attempts').put({ id: 'polish-unlock', gloss: 'BAG EKA', referenceId: 'synthetic', score: 70, stage: 'try', worstFingers: [], createdAt: new Date().toISOString() })
      tx.oncomplete = () => { db.close(); resolve() }
    }
  }))
  for (const width of [360, 375, 390]) {
    await page.setViewportSize({ width, height: 844 })
    await page.evaluate(() => sessionStorage.setItem('ssl-learn-session', JSON.stringify({ id: 'polish-recall', glosses: ['BAG EKA'], done: [], startMastery: {}, startedAt: new Date().toISOString() })))
    await page.reload(); await selectPractice(page); await page.getByRole('button', { name: 'My turn', exact: true }).click()
    await page.getByRole('button', { name: 'Recall', exact: true }).click()
    await expect(page.locator('.practice-reference-card canvas')).toHaveCount(0); await fits(page, width)
    await page.getByRole('button', { name: 'Reveal reference', exact: true }).click()
    await page.getByRole('button', { name: 'Show reference', exact: true }).click()
    await expect(page.locator('.practice-reference-card canvas')).toBeVisible(); await fits(page, width)
    await page.evaluate(signs => sessionStorage.setItem('ssl-learn-session', JSON.stringify({ id: 'polish-complete', glosses: signs, done: signs, startMastery: {}, startedAt: new Date().toISOString() })), CURRICULUM_UNITS[0].signs)
    await page.reload(); await selectPractice(page); await expect(page.getByRole('heading', { name: 'Nice work!', exact: true })).toBeFocused(); await fits(page, width)
  }
})

// Spot checks of selected real rendered text, not a claim of a full WCAG audit.
// AA normal text: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
for (const theme of ['light', 'dark']) {
  test(`${theme} text contrast in the explorer and teaching controls`, async ({ page }) => {
    const checks: { selector: string, ratio: number }[] = []
    await page.addInitScript(theme => localStorage.setItem('suvana.learn.theme', theme), theme)
    await enter(page)
    await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme)
    async function check(selectors: string[]) {
      for (const selector of selectors) {
        const ratio = await page.locator(selector).first().evaluate(el => {
          const rgb = (s: string) => (s.match(/[\d.]+/g) || []).map(Number)
          let bg = [0, 0, 0], alpha = 1
          let node: Element | null = el
          // Resolve transparent ancestor surfaces against the opaque page.
          const layers: number[][] = []
          while (node) { layers.push(rgb(getComputedStyle(node).backgroundColor)); node = node.parentElement }
          for (const layer of layers.reverse()) { alpha = layer[3] ?? 1; bg = bg.map((v, i) => layer[i] * alpha + v * (1 - alpha)) }
          const fg = rgb(getComputedStyle(el).color); alpha = fg[3] ?? 1
          const color = bg.map((v, i) => fg[i] * alpha + v * (1 - alpha))
          const lum = (c: number[]) => c.map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4 }).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0)
          const a = lum(color), b = lum(bg)
          return (Math.max(a, b) + .05) / (Math.min(a, b) + .05)
        })
        expect(ratio, `${theme} ${selector}`).toBeGreaterThanOrEqual(4.5)
        checks.push({ selector, ratio })
      }
    }
    await check(['.practice-why summary', '.practice-reference-card .practice-kicker', '.practice-watch-next p'])
    await page.getByRole('button', { name: 'Choose a different sign (Esc)', exact: true }).click()
    await check(['.practice-welcome .practice-kicker', '.practice-collection-title p', '.practice-category-bottom span', '.practice-category h3'])
    await page.getByRole('searchbox', { name: 'Search all signs', exact: true }).fill('BAG EKA')
    await check(['.practice-sign-category', '.practice-sign-select h3', '.practice-sign-select span'])
    await test.info().attach(`${theme}-contrast-spots`, { body: JSON.stringify(checks, null, 2), contentType: 'application/json' })
  })
}
