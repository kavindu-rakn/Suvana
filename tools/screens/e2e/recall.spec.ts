import { test, expect, type Page } from '@playwright/test'
import { CURRICULUM_UNITS } from '../../../apps/learn/src/data/curriculum'
import { translationOf } from '../../../apps/learn/src/data/translations'
import { mockHandDetectionScript } from './helpers/hands'

async function prepare(page: Page, gloss = 'BAG EKA') {
  await page.addInitScript(gloss => {
    sessionStorage.setItem('suvana.learn.entered', '1')
    localStorage.setItem('suvana.learn.onboarding-seen', '1')
    ;(window as unknown as { __mockHands: boolean }).__mockHands = true
    sessionStorage.setItem('ssl-learn-session', JSON.stringify({ id: 'synthetic-recall', glosses: [gloss], done: [], startMastery: {}, startedAt: new Date().toISOString() }))
  }, gloss)
  await page.addInitScript(mockHandDetectionScript)
  await page.goto('./')
  await page.evaluate(gloss => new Promise<void>((resolve, reject) => {
    const req = indexedDB.open('ssl-learn', 3)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => {
      const db = req.result, tx = db.transaction('attempts', 'readwrite')
      tx.objectStore('attempts').put({ id: 'synthetic-two-stars', gloss, referenceId: 'fixture', score: 70, stage: 'try', worstFingers: [], createdAt: '2026-10-14T10:00:00Z' })
      tx.oncomplete = () => { db.close(); resolve() }
    }
  }), gloss)
  await page.reload()
  await page.getByRole('button', { name: 'My turn', exact: true }).click()
  await page.getByRole('button', { name: '3. Recall', exact: true }).click()
}

test('Recall shows verified meaning, hides reference and guide until reveal', async ({ page }) => {
  await prepare(page)
  await expect(page.locator('.aww-pane-title').first()).toHaveText(translationOf('BAG EKA')!)
  await expect(page.locator('.aww-pane-left canvas')).toHaveCount(0)
  await expect(page.getByText('Why this sign?', { exact: true })).not.toBeVisible()
  await expect(page.getByRole('button', { name: /Ghost|hand guide/i })).not.toBeVisible()
  await page.getByRole('button', { name: 'Reveal (costs the 3rd star)', exact: true }).click()
  await expect(page.locator('.aww-pane-left canvas')).toBeVisible()
  await page.getByRole('button', { name: '3. Recall', exact: true }).click()
  await expect(page.locator('.aww-pane-left canvas')).toBeVisible() // same take stays revealed
})

test('Recall falls back to a real gloss without a verified meaning', async ({ page }) => {
  const gloss = CURRICULUM_UNITS.flatMap(unit => unit.signs).find(label => !translationOf(label))!
  expect(gloss).toBeTruthy()
  await prepare(page, gloss)
  await expect(page.locator('.aww-pane-title').first()).toHaveText(gloss)
  await expect(page.locator('.aww-pane-left canvas')).toHaveCount(0)
})

for (const reveal of [false, true]) test(`scored Recall records revealed=${reveal} and shows reference after scoring`, async ({ page }) => {
  await prepare(page)
  if (reveal) await page.getByRole('button', { name: 'Reveal (costs the 3rd star)', exact: true }).click()
  await page.getByRole('button', { name: 'Turn on camera', exact: true }).click()
  await expect(page.locator('#aww-hands-pill')).toHaveAttribute('data-ready', 'yes', { timeout: 15000 })
  await page.getByRole('button', { name: 'Record attempt (Space)', exact: true }).click()
  await expect(page.locator('.aww-cam-btn-stop')).toBeVisible({ timeout: 5000 })
  await page.waitForTimeout(300)
  await page.locator('.aww-cam-btn-stop').click()
  await expect(page.getByRole('img', { name: 'Reference hand replay', exact: true })).toBeVisible()
  const entries = await page.evaluate(() => new Promise<Array<{ stage: string; revealed: boolean; sessionId: string }>>((resolve, reject) => {
    const req = indexedDB.open('ssl-learn', 3)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => {
      const db = req.result, tx = db.transaction('attempts'), all = tx.objectStore('attempts').getAll()
      all.onsuccess = () => resolve(all.result)
      tx.oncomplete = () => db.close()
    }
  }))
  expect(entries.filter(entry => entry.stage === 'recall')).toMatchObject([{ revealed: reveal, sessionId: 'synthetic-recall' }])
})
