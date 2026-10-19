import { test, expect } from '@playwright/test'
import { CURRICULUM_UNITS } from '../../../apps/learn/src/data/curriculum'

test('Hero opens Path without starting practice and reload returns to Path', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('suvana.learn.onboarding-seen', '1'))
  await page.goto('./')
  await page.getByRole('button', { name: 'Start learning', exact: true }).click()
  await expect(page.getByRole('tab', { name: /Path/ }).first()).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('.path-card')).toHaveCount(CURRICULUM_UNITS.length + 1)
  expect(await page.evaluate(() => sessionStorage.getItem('ssl-learn-session'))).toBeNull()
  await page.getByRole('tab', { name: /Practice/ }).first().click()
  await page.reload()
  await expect(page.locator('.path-card').first()).toBeVisible()
  await expect(page.getByRole('tab', { name: /Path/ }).first()).toHaveAttribute('aria-selected', 'true')
  expect(await page.locator('.path-card').first().evaluate(node => getComputedStyle(node, '::before').content)).toBe('none')
})

test('Hero still enters Path when session storage is blocked', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('suvana.learn.onboarding-seen', '1')
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function(key, value) {
      if (this === sessionStorage) throw new DOMException('blocked', 'SecurityError')
      return original.call(this, key, value)
    }
  })
  await page.goto('./')
  await page.getByRole('button', { name: 'Start learning', exact: true }).click()
  await expect(page.locator('.path-card').first()).toBeVisible()
})

test('author bookmarks retain tools without header entry buttons', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('suvana.learn.entered', '1'))
  await page.goto('./?mode=author')
  await expect(page.getByRole('tab', { name: /Study/ }).first()).toBeVisible()
  await expect(page.locator('.aww-author-enter-btn, .aww-author-exit-btn, .aww-telemetry-pill')).toHaveCount(0)
  await expect(page.locator('.path-card').first()).toBeVisible()
})

test('completed session shows earned stars and next unit without double counting', async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem('suvana.learn.entered', '1')
    localStorage.setItem('suvana.learn.onboarding-seen', '1')
  })
  await page.goto('./')
  await expect(page.locator('.path-card').first()).toBeVisible()
  await page.evaluate(async signs => {
    const session = { id: 'synthetic-session', glosses: signs, done: signs, startMastery: {}, startedAt: new Date().toISOString() }
    sessionStorage.setItem('ssl-learn-session', JSON.stringify(session))
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open('ssl-learn', 3)
      req.onsuccess = () => {
        const db = req.result, tx = db.transaction('attempts', 'readwrite')
        for (const [i, gloss] of signs.entries()) {
          // First sign already had two stars. Repeats must not award them again.
          if (i === 0) tx.objectStore('attempts').put({ id: 'prior', gloss, referenceId: 'fixture', score: 70, stage: 'try', worstFingers: [], createdAt: new Date(Date.now() - 60000).toISOString() })
          tx.objectStore('attempts').put({ id: `synthetic-${i}`, gloss, referenceId: 'fixture', score: 70, stage: 'try', sessionId: session.id, worstFingers: [], createdAt: new Date().toISOString() })
        }
        tx.oncomplete = () => { db.close(); resolve() }
        tx.onerror = () => reject(tx.error)
      }
    })
  }, CURRICULUM_UNITS[0].signs)
  await page.reload()
  await page.getByRole('tab', { name: /Practice/ }).first().click()
  await expect(page.getByRole('heading', { name: 'Nice work!', exact: true })).toBeFocused()
  expect(await page.locator('#session-complete-title').evaluate(el => getComputedStyle(el).outlineStyle)).toBe('none')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Keep practising', exact: true })).toBeFocused()
  expect(await page.getByRole('button', { name: 'Keep practising', exact: true }).evaluate(el => getComputedStyle(el).outlineStyle)).toBe('solid')
  await expect(page.locator('.session-complete-stats dd').first()).toHaveText('12')
  await expect(page.locator('.session-complete-stats dd').last()).toHaveText('5/5')
  await expect(page.locator('.session-next')).toContainText('Greetings')
  await page.getByRole('button', { name: 'Keep practising', exact: true }).click()
  await expect(page.locator('.aww-browse')).toBeVisible()
  expect(await page.evaluate(() => sessionStorage.getItem('ssl-learn-session'))).toBeNull()
})
