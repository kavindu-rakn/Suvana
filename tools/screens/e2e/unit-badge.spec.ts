import { test, expect, type Page } from '@playwright/test'
import { CURRICULUM_UNITS } from '../../../apps/learn/src/data/curriculum'

async function seed(page: Page, recall: boolean) {
  // Synthetic progress for real Starter labels; not learner results.
  await page.evaluate(async ({ signs, recall }) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('ssl-learn', 3)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const db = request.result, tx = db.transaction('attempts', 'readwrite')
        for (const [i, gloss] of signs.entries()) {
          for (let j = 0; j < (recall ? 4 : 3); j++) {
            tx.objectStore('attempts').put({ id: `badge-fixture-${i}-${j}`, gloss,
              referenceId: 'synthetic-ui-fixture', score: j === 3 ? 60 : 90,
              stage: j === 3 ? 'recall' : 'try', revealed: j === 3 ? false : undefined,
              worstFingers: [], createdAt: new Date(Date.now() - 180000 + j * 30000 + i).toISOString() })
          }
        }
        tx.oncomplete = () => { db.close(); resolve() }
        tx.onerror = () => reject(tx.error)
      }
    })
  }, { signs: CURRICULUM_UNITS[0].signs, recall })
  await page.reload()
  await page.getByRole('tab', { name: /Path/ }).first().click()
}

test('unit badges follow earned stars while mastery and unlock rules stay unchanged', async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem('suvana.learn.entered', '1')
    localStorage.setItem('suvana.learn.onboarding-seen', '1')
  })
  await page.goto('./')
  await page.getByRole('tab', { name: /Path/ }).first().click()
  await expect(page.locator('.path-card').first()).toBeVisible()
  for (const recall of [false, true]) {
    await seed(page, recall)
    const card = page.locator('.path-card').first()
    // The 60 Recall earns a third star but lowers the history estimate below
    // mastered. Only displayed copy changes; internal state remains untouched.
    await expect(card).toHaveAttribute('data-state', recall ? 'passed' : 'mastered')
    await expect(card).toContainText(recall ? '21/21 stars' : '14/21 stars')
    await expect(card.locator('.path-state')).toHaveText(recall ? 'Mastered' : 'Passed')
    await expect(page.locator('.path-card').nth(1)).toHaveAttribute('data-state', 'open')
    await page.getByRole('tab', { name: /Progress/ }).first().click()
    await page.getByText('See the unit plan', { exact: true }).click()
    await expect(page.locator('.pg-unit-list li').first()).toContainText(recall ? '7 signs · Mastered' : '7 signs · Passed')
    await expect(page.locator('.pg-unit-list li').first()).toContainText(recall ? '21/21 stars' : '14/21 stars')
  }
})
