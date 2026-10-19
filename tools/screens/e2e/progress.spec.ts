import { test, expect, type Page } from '@playwright/test'

// Synthetic UI fixtures using existing glosses, never study/learner results.
const fixtureNow = new Date()
fixtureNow.setHours(12, 0, 0, 0)

function demoAttempts() {
  return [['KANAWA', 90], ['KANAWA', 92], ['KANAWA', 93], ['BONAWA', 30], ['500', 70]]
    .map(([gloss, score], i) => ({ id: `demo-${i}`, gloss, score, referenceId: 'fixture',
      worstFingers: [], stage: 'try', createdAt: new Date(fixtureNow.getTime() - (10 - i) * 60000).toISOString() }))
}

async function prepare(page: Page, profile = 'demo') {
  await page.clock.install({ time: fixtureNow })
  await page.addInitScript(({ profile }) => {
    sessionStorage.setItem('suvana.learn.entered', '1')
    localStorage.setItem('suvana.learn.profile', profile)
  }, { profile })
  await page.goto('./')
  await page.evaluate(async ({ demo }) => {
    for (const [name, entries] of [['ssl-learn-demo', demo], ['ssl-learn', [demo[0]]]] as const) {
      await new Promise<void>((resolve, reject) => {
        const req = indexedDB.open(name, 3)
        req.onupgradeneeded = () => {
          for (const store of ['recordings', 'attempts', 'latency']) {
            if (!req.result.objectStoreNames.contains(store)) req.result.createObjectStore(store, { keyPath: 'id' })
          }
        }
        req.onerror = () => reject(req.error)
        req.onsuccess = () => {
          const db = req.result, tx = db.transaction(['attempts', 'recordings', 'latency'], 'readwrite')
          const store = tx.objectStore('attempts')
          store.clear()
          for (const entry of entries) store.put(entry)
          tx.objectStore('recordings').put({ id: 'saved-reference', gloss: 'KANAWA', frames: [], createdAt: new Date().toISOString(), durationMs: 1, fps: 1 })
          tx.objectStore('latency').put({ id: 'saved-timing', createdAt: new Date().toISOString(), gloss: 'KANAWA', frameCount: 10, mode: 'practice', totalMs: 20, trackingMs: 5, scoringMs: 5, renderMs: 10 })
          tx.oncomplete = () => { db.close(); resolve() }
          tx.onerror = () => reject(tx.error)
        }
      })
    }
  }, { demo: demoAttempts() })
  await page.reload()
  await page.getByRole('tab', { name: /Progress/ }).press('Enter')
  await expect(page.locator('.pg-game-stats')).toBeVisible()
}

async function count(page: Page, name: string, store: string) {
  return page.evaluate(async ({ name, store }) => new Promise<number>((resolve, reject) => {
    const req = indexedDB.open(name, 3)
    req.onsuccess = () => {
      const db = req.result, tx = db.transaction(store), query = tx.objectStore(store).count()
      query.onsuccess = () => resolve(query.result)
      tx.oncomplete = () => db.close()
    }
    req.onerror = () => reject(req.error)
  }), { name, store })
}

test('Progress shows game rules and the approved curriculum states', async ({ page }) => {
  await prepare(page)
  const values = page.locator('.pg-game-stats > div > strong')
  await expect(values).toHaveText(['2', '4', '1', '5/5'])
  await expect(page.locator('.pg-stat').filter({ hasText: 'Goal streak' })).toContainText('1')
  await page.locator('.pg-units summary').click()
  await expect(page.locator('.pg-unit-list')).not.toContainText('Plan preview')
  await expect(page.locator('.pg-unit-list li').first()).toContainText('Starter')
  await expect(page.locator('.pg-unit-list li').first()).toContainText('Ready')
  await expect(page.locator('.pg-unit-list li').nth(1)).toContainText('Greetings')
  await expect(page.locator('.pg-unit-list li').nth(1)).toContainText('Later')
})

test('switching profiles clears the practice queue and restores separate progress', async ({ page }) => {
  await prepare(page)
  await page.evaluate(() => sessionStorage.setItem('ssl-learn-session', 'old-profile-queue'))
  await page.locator('#pg-profile').selectOption('default')
  await expect(page.locator('.pg-game-stats > div > strong').last()).toHaveText('1/5')
  expect(await page.evaluate(() => sessionStorage.getItem('ssl-learn-session'))).toBeNull()
  await page.locator('#pg-profile').selectOption('demo')
  await expect(page.locator('.pg-game-stats > div > strong').last()).toHaveText('5/5')
  expect(await count(page, 'ssl-learn', 'attempts')).toBe(1)
})

test('reset cancel preserves data; confirm clears only this profile attempts', async ({ page }) => {
  await prepare(page)
  await page.getByRole('button', { name: 'Reset progress', exact: true }).click()
  await page.getByRole('button', { name: 'Keep progress', exact: true }).click()
  expect(await count(page, 'ssl-learn-demo', 'attempts')).toBe(5)
  await page.evaluate(() => sessionStorage.setItem('ssl-learn-session', 'old-queue'))
  await page.getByRole('button', { name: 'Reset progress', exact: true }).click()
  await page.getByRole('button', { name: 'Clear progress', exact: true }).click()
  await expect(page.locator('.pg-game-stats > div > strong').last()).toHaveText('0/5')
  expect(await count(page, 'ssl-learn-demo', 'attempts')).toBe(0)
  expect(await count(page, 'ssl-learn', 'attempts')).toBe(1)
  expect(await count(page, 'ssl-learn-demo', 'recordings')).toBe(1)
  expect(await count(page, 'ssl-learn-demo', 'latency')).toBe(1)
  expect(await page.evaluate(() => sessionStorage.getItem('ssl-learn-session'))).toBeNull()
})

test('a failed reset stays visible in the confirmation dialog and preserves progress', async ({ page }) => {
  await prepare(page)
  await page.evaluate(() => {
    Object.defineProperty(indexedDB, 'open', { configurable: true, value: () => { throw new Error('blocked') } })
  })
  await page.getByRole('button', { name: 'Reset progress', exact: true }).click()
  await page.getByRole('button', { name: 'Clear progress', exact: true }).click()
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Could not clear')
  await page.evaluate(() => { delete (indexedDB as unknown as { open?: unknown }).open })
  expect(await count(page, 'ssl-learn-demo', 'attempts')).toBe(5)
})

test('blocked profile persistence is reported while the current-page switch works', async ({ page }) => {
  await prepare(page, 'default')
  await page.evaluate(() => {
    Object.defineProperty(Storage.prototype, 'setItem', { configurable: true, value: () => { throw new Error('blocked') } })
  })
  await page.locator('#pg-profile').selectOption('demo')
  await expect(page.locator('.pg-game-stats > div > strong').last()).toHaveText('5/5')
  await expect(page.locator('.pg-settings')).toContainText('until you reload')
})

test('the existing Study JSON and CSV exports still use the selected profile', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ssl-learn-mode', 'author'))
  await prepare(page, 'default')
  await page.locator('#pg-profile').selectOption('demo')
  await expect(page.locator('.pg-game-stats > div > strong').last()).toHaveText('5/5')
  await page.getByRole('tab', { name: /Study/ }).press('Enter')
  for (const format of ['JSON', 'CSV']) {
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: `Export results (${format})`, exact: true }).click()
    const result = await download
    const stream = await result.createReadStream()
    const chunks: Buffer[] = []
    for await (const chunk of stream!) chunks.push(Buffer.from(chunk))
    const text = Buffer.concat(chunks).toString('utf8')
    if (format === 'JSON') expect(JSON.parse(text).totals.attempts).toBe(5)
    else {
      expect(text.trim().split('\n')).toHaveLength(6)
      expect(text).toContain(',500,70,')
    }
  }
})
