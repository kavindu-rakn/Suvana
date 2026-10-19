import { test, expect, type Page } from '@playwright/test'
import { CURRICULUM_UNITS } from '../../../apps/learn/src/data/curriculum'

async function enter(page: Page) {
  await page.addInitScript(() => {
    sessionStorage.setItem('suvana.learn.entered', '1')
    localStorage.setItem('suvana.learn.onboarding-seen', '1')
  })
  await page.goto('./')
  await page.getByRole('tab', { name: /Path/ }).first().click()
  await expect(page.locator('.path-card').first()).toHaveAttribute('data-state', 'open')
}

test('empty Path, unit Watch and an eight-sign session entry', async ({ page }) => {
  await enter(page)
  await expect(page.locator('.path-card').nth(1)).toHaveAttribute('data-state', 'locked')
  await page.locator('.path-card').first().click()
  await expect(page.locator('.path-signs li')).toHaveCount(CURRICULUM_UNITS[0].signs.length)
  await page.getByRole('button', { name: 'Watch BAG EKA', exact: true }).click()
  await expect(page.locator('.path-preview canvas')).toBeVisible()
  await page.getByRole('button', { name: 'Practise this unit', exact: true }).click()
  await expect(page.locator('.aww-pane-title').first()).toContainText('BAG EKA')
  const session = await page.evaluate(() => JSON.parse(sessionStorage.getItem('ssl-learn-session')!))
  expect(session.unitId).toBe(CURRICULUM_UNITS[0].id)
  expect(session.glosses).toHaveLength(7) // Starter has seven signs; cap is eight.
  expect(session.glosses).toEqual(CURRICULUM_UNITS[0].signs)
  await page.getByText('Why this sign?', { exact: true }).click()
  await expect(page.locator('.practice-reason')).toContainText('new: next in unit')
})

test('seeded Try stars pass Starter and open Greetings', async ({ page }) => {
  await enter(page)
  await page.evaluate(async signs => {
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open('ssl-learn', 3)
      req.onerror = () => reject(req.error)
      req.onsuccess = () => {
        const db = req.result, tx = db.transaction('attempts', 'readwrite')
        for (const [i, gloss] of signs.entries()) tx.objectStore('attempts').put({
          id: `path-fixture-${i}`, gloss, referenceId: 'synthetic-ui-fixture',
          score: 70, stage: 'try', worstFingers: [], createdAt: '2026-10-14T10:00:00Z',
        })
        tx.oncomplete = () => { db.close(); resolve() }
        tx.onerror = () => reject(tx.error)
      }
    })
  }, CURRICULUM_UNITS[0].signs)
  await page.reload()
  await page.getByRole('tab', { name: /Path/ }).first().click()
  await expect(page.locator('.path-card').first().locator('.path-star-count')).toHaveAttribute('aria-label', '14 of 21 stars')
  await expect(page.locator('.path-card').first().locator('.lucide-star-check')).toBeVisible()
  await expect(page.locator('.path-card').nth(1)).toHaveAttribute('data-state', 'open')
  await page.locator('.path-card').nth(2).click()
  await expect(page.getByRole('button', { name: 'Practise this unit', exact: true })).toBeDisabled()
  await expect(page.getByRole('tab', { name: /Practice/ }).first()).toBeEnabled()
})

test('Path fits 390 and 360 pixel screens', async ({ page }) => {
  for (const width of [390, 360]) {
    await page.setViewportSize({ width, height: 844 })
    await enter(page)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.locator('.path-card').first().click()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
})
