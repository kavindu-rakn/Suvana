import { test, expect, type Page } from '@playwright/test'
import { CURRICULUM_UNITS } from '../../../apps/learn/src/data/curriculum'
import { SENTENCES, SENTENCE_EXPERIMENTAL_LABEL } from '../../../apps/learn/src/data/sentences'
import { mockHandDetectionScript } from './helpers/hands'

async function seedPath(page: Page, signs = [...new Set(CURRICULUM_UNITS.flatMap(unit => unit.signs))]) {
  // Synthetic unlock progress for UI tests, not participant evidence.
  await page.evaluate(async signs => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('ssl-learn', 3)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result, tx = db.transaction('attempts', 'readwrite')
      for (const [i, gloss] of signs.entries()) tx.objectStore('attempts').put({ id: `sentence-unlock-${i}`, gloss, referenceId: 'synthetic-ui-fixture', score: 60, stage: 'try', worstFingers: [], createdAt: '2026-10-16T01:00:00Z' })
      tx.oncomplete = () => { db.close(); resolve() }; tx.onerror = () => reject(tx.error)
    }
  }), signs)
  await page.reload()
  await page.getByRole('tab', { name: /Path/ }).first().click()
}
async function enter(page: Page, unlock = true) {
  await page.addInitScript(() => {
    sessionStorage.setItem('suvana.learn.entered', '1')
    localStorage.setItem('suvana.learn.onboarding-seen', '1')
    ;(window as unknown as { __mockHands: boolean }).__mockHands = true
  })
  await page.addInitScript(mockHandDetectionScript)
  await page.goto('./')
  await page.getByRole('tab', { name: /Path/ }).first().click()
  await expect(page.locator('.sentence-entry')).toBeVisible()
  if (unlock) {
    await seedPath(page)
    await page.locator('.sentence-entry').click()
    await expect(page.locator('.sentence-choice').first()).toBeVisible()
  }
}
async function record(page: Page) {
  await page.getByRole('button', { name: 'Start camera', exact: true }).click()
  await expect(page.locator('.sentence-view .sentence-camera video')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Record sentence', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Record sentence', exact: true }).click()
  await expect(page.locator('.sentence-view')).toHaveAttribute('data-phase', 'recording', { timeout: 10000 })
  await page.waitForTimeout(350)
  await page.getByRole('button', { name: 'Finish recording', exact: true }).click()
}
async function logs(page: Page) {
  return page.evaluate(async () => new Promise<Array<{ stage: string; revealed?: boolean; referenceId: string }>>((resolve, reject) => {
    const request = indexedDB.open('ssl-learn', 3)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result, tx = db.transaction('attempts'), query = tx.objectStore('attempts').getAll()
      query.onsuccess = () => resolve(query.result.filter(entry => entry.stage === 'sentence').sort((a, b) => a.createdAt.localeCompare(b.createdAt)))
      tx.oncomplete = () => db.close()
    }
  }))
}

test('sentence challenge is last and requires the completed preceding Path', async ({ page }) => {
  await enter(page, false)
  await expect(page.locator('.path-units > li').last().locator('.sentence-entry')).toBeDisabled()
  await expect(page.locator('.sentence-entry')).toContainText(SENTENCE_EXPERIMENTAL_LABEL)
  await seedPath(page, CURRICULUM_UNITS.at(-1)!.signs)
  await expect(page.locator('.sentence-entry')).toBeDisabled() // Last-unit stars alone cannot bypass earlier units.
  await seedPath(page)
  await expect(page.locator('.sentence-entry')).toBeEnabled()
})

test('sentence catalogue retains every raw dataset label including trailing spaces', async ({ page }) => {
  await enter(page)
  expect(await page.locator('.sentence-choice .sentence-dataset-label').allTextContents()).toEqual(SENTENCES.map(sentence => sentence.datasetLabel))
  await expect(page.locator('.sentence-experimental')).toHaveText(SENTENCE_EXPERIMENTAL_LABEL)
  const index = SENTENCES.findIndex(sentence => sentence.datasetLabel.endsWith(' '))
  await page.locator('.sentence-choice').nth(index).click()
  await expect(page.locator('.sentence-player canvas')).toBeVisible()
  expect(await page.locator('h2.sentence-dataset-label').textContent()).toBe(SENTENCES[index].datasetLabel)
})

test('sentence list offers only references present in the sentence index', async ({ page }) => {
  await page.route('**/reference-index.json*', async route => {
    const response = await route.fetch(), raw = await response.json()
    raw.recordings = raw.recordings.filter((rec: { id: string }) => rec.id !== SENTENCES[0].refId)
    await route.fulfill({ response, json: raw })
  })
  await enter(page)
  expect(await page.locator('.sentence-choice .sentence-dataset-label').allTextContents()).toEqual(SENTENCES.slice(1).map(sentence => sentence.datasetLabel))
})

test('whole reference Watch, visible Try and hidden Recall save only sentence-stage attempts', async ({ page }) => {
  test.setTimeout(60000)
  await enter(page)
  await page.locator('.sentence-choice').first().click()
  await expect(page.locator('.sentence-player .skeleton-player')).toHaveAttribute('data-speed', '0.5')
  await expect(page.getByRole('button', { name: '3. Recall', exact: true })).toBeDisabled()
  const raw = await (await page.request.get(`references/${SENTENCES[0].file}`)).json()
  await expect(page.locator('.sentence-view')).toHaveAttribute('data-capture-ms', String(raw.durationMs * 2))
  await page.waitForTimeout(raw.durationMs * 2 + 100)
  await expect(page.locator('.sentence-player .skeleton-player')).toHaveAttribute('data-speed', '0.5')
  await page.getByRole('button', { name: 'My turn', exact: true }).click()
  await expect(page.locator('.sentence-player canvas')).toBeVisible()
  await record(page)
  await expect(page.locator('.sentence-result')).toBeVisible()
  await expect(page.locator('#sentence-result-title')).toBeFocused()
  const titleTop = await page.locator('#sentence-result-title').evaluate(el => el.getBoundingClientRect().top)
  const noticeBottom = await page.locator('.sentence-experimental').evaluate(el => el.getBoundingClientRect().bottom)
  expect(titleTop).toBeGreaterThanOrEqual(noticeBottom)
  await expect.poll(() => logs(page).then(entries => entries.length)).toBe(1)
  await page.getByRole('button', { name: 'Try from memory', exact: true }).click()
  await expect(page.locator('.sentence-player')).toHaveCount(0)
  expect(await page.locator('h2.sentence-dataset-label').textContent()).toBe(SENTENCES[0].datasetLabel)
  await record(page)
  await expect(page.locator('.sentence-result')).toBeVisible()
  await expect.poll(() => logs(page).then(entries => entries.length)).toBe(2)
  const attempts = await logs(page)
  expect(attempts.every(entry => entry.stage === 'sentence' && entry.referenceId === SENTENCES[0].refId)).toBe(true)
  expect(attempts[1].revealed).toBe(false)
  await expect(page.locator('.sentence-experimental')).toBeVisible()
  await expect(page.locator('.sentence-camera')).toHaveCount(0)
})

test('revealing Recall is sticky for its take; retry starts hidden again', async ({ page }) => {
  test.setTimeout(60000)
  await enter(page)
  await page.locator('.sentence-choice').first().click()
  await page.getByRole('button', { name: 'My turn', exact: true }).click()
  await record(page)
  await page.getByRole('button', { name: 'Try from memory', exact: true }).click()
  await page.getByRole('button', { name: 'Show reference', exact: true }).click()
  await expect(page.locator('.sentence-player canvas')).toBeVisible()
  await record(page)
  await expect.poll(() => logs(page).then(entries => entries.at(-1)?.revealed)).toBe(true)
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(page.locator('.sentence-player')).toHaveCount(0)
})

test('handless capture stays unscored and camera stops when leaving the challenge', async ({ page }) => {
  await enter(page)
  await page.locator('.sentence-choice').first().click()
  await page.getByRole('button', { name: 'My turn', exact: true }).click()
  await page.evaluate(() => Object.defineProperty(Object.prototype, 'detectForVideo', { configurable: true, get: () => () => ({ landmarks: [], worldLandmarks: [], handedness: [] }), set: () => {} }))
  await record(page)
  await expect(page.locator('.sentence-status')).toContainText('no score was saved')
  await expect(page.locator('.sentence-result')).toHaveCount(0)
  expect(await logs(page)).toEqual([])
  await page.evaluate(() => { (window as unknown as { sentenceStream: MediaStream }).sentenceStream = document.querySelector<HTMLVideoElement>('.sentence-camera video')!.srcObject as MediaStream })
  await page.getByRole('button', { name: 'Back to path', exact: true }).click()
  expect(await page.evaluate(() => (window as unknown as { sentenceStream: MediaStream }).sentenceStream.getTracks().every(track => track.readyState === 'ended'))).toBe(true)
})

test('hiding during countdown cancels the take without saving a sentence score', async ({ page }) => {
  await enter(page)
  await page.locator('.sentence-choice').first().click()
  await page.getByRole('button', { name: 'My turn', exact: true }).click()
  await page.getByRole('button', { name: 'Start camera', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Record sentence', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Record sentence', exact: true }).click()
  await expect(page.locator('.sentence-view')).toHaveAttribute('data-phase', 'countdown')
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect(page.locator('.sentence-view')).toHaveAttribute('data-phase', 'idle')
  await expect(page.locator('.sentence-status')).toContainText('no score was saved')
  expect(await logs(page)).toEqual([])
})

test('failed sentence frame load offers retry and never enters capture', async ({ page }) => {
  await page.route(`**/references/${SENTENCES[0].file}*`, route => route.fulfill({ status: 503, body: 'unavailable' }))
  await enter(page)
  await page.locator('.sentence-choice').first().click()
  await expect(page.locator('.sentence-status')).toContainText('could not load')
  await expect(page.locator('.sentence-camera')).toHaveCount(0)
  await expect(page.locator('.sentence-experimental')).toBeVisible()
  await page.unroute(`**/references/${SENTENCES[0].file}*`)
  await page.getByRole('button', { name: 'Reload this reference', exact: true }).click()
  await expect(page.locator('.sentence-player canvas')).toBeVisible()
})

test('sentence layouts fit and experimental notice stays above player controls in both themes', async ({ page }) => {
  test.setTimeout(60000)
  for (const [width, height] of [[1280, 800], [390, 844], [360, 800]]) {
    await page.setViewportSize({ width, height })
    await enter(page)
    await page.locator('.sentence-choice').first().click()
    await expect(page.locator('.sentence-player canvas')).toBeVisible()
    const stepTops = await page.locator('.sentence-steps button').evaluateAll(nodes => nodes.map(el => el.getBoundingClientRect().top))
    expect(new Set(stepTops).size).toBe(1)
    for (const theme of ['light', 'dark']) {
      await page.evaluate(theme => { document.documentElement.dataset.theme = theme }, theme)
      await page.locator('.sentence-player').scrollIntoViewIfNeeded()
      const notice = page.locator('.sentence-experimental')
      await expect(notice).toBeVisible()
      expect(await notice.evaluate(el => {
        const rect = el.getBoundingClientRect()
        return el.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2))
      })).toBe(true)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    }
    await page.getByRole('button', { name: 'My turn', exact: true }).click()
    await page.locator('.sentence-camera').scrollIntoViewIfNeeded()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.getByRole('button', { name: 'Back to path', exact: true }).click()
  }
})

test('CC0 selection cannot unlock the challenge through old full-corpus stars', async ({ page }) => {
  await page.route('**/reference-index.json*', async route => {
    const response = await route.fetch(), raw = await response.json()
    raw.recordings = raw.recordings.filter((rec: { source: string }) => rec.source === 'kaggle-dataset')
    await route.fulfill({ response, json: raw })
  })
  await enter(page, false)
  await seedPath(page)
  await expect(page.locator('.sentence-entry')).toBeDisabled()
  await expect(page.locator('.sentence-entry')).toContainText(SENTENCE_EXPERIMENTAL_LABEL)
})

for (const [width, height] of [[390, 844], [360, 800]]) {
  test(`phone Recall keeps its notice visible without covering controls at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    await enter(page)
    await page.locator('.sentence-choice').first().click()
    await page.getByRole('button', { name: 'My turn', exact: true }).click()
    await record(page)
    await expect(page.locator('#sentence-result-title')).toBeFocused()
    await expect(page.locator('#sentence-result-title')).toBeInViewport()
    await page.getByRole('button', { name: 'Try from memory', exact: true }).click()

    for (const theme of ['light', 'dark']) {
      await page.evaluate(theme => { document.documentElement.dataset.theme = theme }, theme)
      for (const name of ['Choose another sentence', '3. Recall', 'Show reference', 'Start camera', 'Record sentence']) {
        const button = page.getByRole('button', { name, exact: true })
        // Native scrolling/focus must reveal the whole target, even at the
        // top edge where the former sticky paragraph covered Recall controls.
        await button.evaluate(el => el.scrollIntoView({ block: 'start' }))
        await expect(page.locator('.sentence-experimental')).toHaveText(SENTENCE_EXPERIMENTAL_LABEL)
        await expect(page.locator('.sentence-experimental')).toBeInViewport({ ratio: 1 })
        expect(await button.evaluate(el => {
          const rect = el.getBoundingClientRect()
          const notice = document.querySelector('.sentence-experimental')!.getBoundingClientRect()
          return rect.top >= notice.bottom && [2, rect.height / 2, rect.height - 2].every(y =>
            el.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + y)))
        })).toBe(true)
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    }

    const choose = page.getByRole('button', { name: 'Choose another sentence', exact: true })
    await choose.evaluate(el => el.scrollIntoView({ block: 'start' }))
    if (width === 390) await choose.click({ position: { x: 20, y: 2 } })
    else { await choose.focus(); await page.keyboard.press('Enter') }
    await expect(page.locator('.sentence-choice').first()).toBeVisible()
    await expect(page.locator('.sentence-experimental')).toBeInViewport({ ratio: 1 })
  })
}
