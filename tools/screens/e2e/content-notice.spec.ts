import { test, expect, type Page } from '@playwright/test'
import { CURRICULUM_UNITS } from '../../../apps/learn/src/data/curriculum'
import { glossLabel } from '../../../apps/learn/src/data/translations'

async function enterPath(page: Page) {
  await page.addInitScript(() => {
    sessionStorage.setItem('suvana.learn.entered', '1')
    localStorage.setItem('suvana.learn.onboarding-seen', '1')
  })
  await page.goto('./')
  await page.getByRole('tab', { name: /Path/ }).first().click()
  await expect(page.locator('.path-card').first()).toBeVisible()
}

test('Hero keeps edition and licence details in the information modal', async ({ page }) => {
  await page.goto('./')
  await expect(page.locator('.content-notice')).not.toBeVisible()
  await page.getByRole('button', { name: 'About Suvana Learn', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'About this edition' })).toBeVisible()
  await expect(page.locator('.content-notice')).toContainText('Free academic edition · Non-commercial')
  await expect(page.locator('.content-notice')).toContainText('No payments. No ads.')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'About Suvana Learn', exact: true })).toBeFocused()
  await expect(page.locator('.app-hero-mode')).toBeVisible()
})

test('landing smooth scrolling leaves modal wheel scrolling native', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 600 })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('./')
  await page.getByRole('button', { name: 'About Suvana Learn', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'About this edition' })
  const before = await page.evaluate(() => scrollY)
  await page.mouse.move(195, 300)
  await page.mouse.wheel(0, 400)
  await expect.poll(() => dialog.evaluate(node => node.scrollTop)).toBeGreaterThan(0)
  expect(await page.evaluate(() => scrollY)).toBeCloseTo(before, 0)
  await expect(dialog.getByRole('button', { name: 'Close information', exact: true })).toBeInViewport()
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
})

for (const theme of ['light', 'dark']) {
  for (const width of [1280, 390, 360]) {
    test(`information modal fits, keeps background inert and closes safely at ${width}px in ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.addInitScript(theme => localStorage.setItem('suvana.theme', theme), theme)
    await enterPath(page)
    await expect(page.getByRole('tab', { name: /Library/ })).toHaveCount(0)
    await expect(page.getByText('On-Device AI', { exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Author tools', exact: true })).toHaveCount(0)
    const trigger = page.getByRole('button', { name: 'About Suvana Learn', exact: true })
    await trigger.focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog', { name: 'About this edition' })
    await expect(dialog).toBeVisible()
    await expect(dialog.locator('.content-notice')).toContainText('Non-commercial')
    await expect(page.locator('.app-footer .attribution')).toBeVisible()
    await expect(page.locator('.app-footer .attribution')).toContainText('Yohan Abhishek')
    await expect(page.locator('.app-footer .attribution a').last()).toHaveAttribute('href', /\/learn\/references\/LICENSES.md$/)
    await expect(dialog).toContainText('CC0 1.0')
    await expect(dialog).toContainText('CC BY-NC-SA 4.0')
    await expect(dialog).toContainText('no video ever leaves your device')
    expect(await dialog.evaluate(node => getComputedStyle(node, '::backdrop').backdropFilter)).toContain('blur')
    const bounds = await dialog.boundingBox()
    expect(bounds!.x).toBeGreaterThanOrEqual(15)
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width - 15)
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab')
      // Native dialogs may tab through browser chrome (activeElement becomes
      // body), but cannot focus any of the inert page controls behind them.
      expect(await dialog.evaluate(node => document.activeElement === document.body || node.contains(document.activeElement))).toBe(true)
    }
    await page.keyboard.press('2')
    await expect(page.locator('main')).toHaveAttribute('data-tab', 'path')
    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible()
    await expect(trigger).toBeFocused()
    await expect(page.locator('.app-hero-mode')).toHaveCount(0)
    await trigger.click()
    await dialog.getByRole('button', { name: 'Close information', exact: true }).click()
    await expect(dialog).not.toBeVisible()
    await expect(trigger).toBeFocused()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    for (const name of ['Scenario', 'Progress', 'Path']) {
      await page.getByRole('tab', { name: new RegExp(name) }).filter({ visible: true }).click()
      await expect(page.getByRole('button', { name: 'Research & authoring tools', exact: true })).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'About Suvana Learn', exact: true })).toBeVisible()
    }
    })
  }
}

test('filtered Path preserves every approved sign and disables missing references', async ({ page }) => {
  // Actual corpus metadata, reduced to the same declared-CC0 selection as L-20.
  await page.route('**/reference-index.json*', async route => {
    const response = await route.fetch()
    const raw = await response.json()
    raw.recordings = raw.recordings.filter((rec: { source: string }) => rec.source === 'kaggle-dataset')
    await route.fulfill({ response, json: raw })
  })
  await enterPath(page)
  const greetings = CURRICULUM_UNITS[1]
  const card = page.locator('.path-card').nth(1)
  await expect(card).toContainText(/Preview: \d+ of 5 signs available/)
  await card.click()
  await expect(page.locator('.path-detail')).toContainText(/Preview: \d+ of 5 signs available/)
  await expect(page.locator('.path-signs li strong')).toHaveText(greetings.signs.map(glossLabel))
  await expect(page.getByRole('button', { name: 'Practise this unit', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Watch AYUBOWAN', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Try AYUBOWAN', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Back to path', exact: true }).click()
  await page.locator('.path-card').first().click()
  await expect(page.getByRole('button', { name: 'Watch BAG EKA', exact: true })).toBeEnabled()
})

test('saved full-edition stars cannot complete a Preview unit or unlock its successor', async ({ page }) => {
  await enterPath(page)
  // Synthetic test progress, isolated to this browser context.
  await page.evaluate(async units => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('ssl-learn', 3)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const db = request.result, tx = db.transaction('attempts', 'readwrite')
        for (const [i, gloss] of [...new Set(units.flatMap(unit => unit.signs))].entries()) {
          tx.objectStore('attempts').put({ id: `content-fixture-${i}`, gloss,
            referenceId: 'synthetic-ui-fixture', score: 70, stage: 'try',
            worstFingers: [], createdAt: '2026-10-14T10:00:00Z' })
        }
        tx.oncomplete = () => { db.close(); resolve() }
        tx.onerror = () => reject(tx.error)
      }
    })
  }, CURRICULUM_UNITS)
  await page.route('**/reference-index.json*', async route => {
    const response = await route.fetch(), raw = await response.json()
    raw.recordings = raw.recordings.filter((rec: { source: string }) => rec.source === 'kaggle-dataset')
    await route.fulfill({ response, json: raw })
  })
  await page.reload()
  await page.getByRole('tab', { name: /Path/ }).first().click()
  await expect(page.locator('.path-card').nth(1)).toHaveAttribute('data-state', 'preview')
  await expect(page.locator('.path-card').nth(3)).toHaveAttribute('data-state', 'locked')
  await page.locator('.path-card').first().click()
  await page.getByRole('button', { name: 'Practise this unit', exact: true }).click()
  const session = await page.evaluate(() => JSON.parse(sessionStorage.getItem('ssl-learn-session')!))
  const raw = await (await page.request.get('reference-index.json')).json()
  const available = new Set(raw.recordings.filter((rec: { source: string }) => rec.source === 'kaggle-dataset').map((rec: { gloss: string }) => rec.gloss))
  expect(session.glosses.length).toBeGreaterThan(0)
  expect(session.glosses.every((gloss: string) => available.has(gloss))).toBe(true)
})
