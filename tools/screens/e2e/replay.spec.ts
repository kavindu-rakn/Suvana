import { test, expect, type Page } from '@playwright/test'
import { mockHandDetectionScript } from './helpers/hands'
import { selectPractice } from './helpers/navigation'

async function scoreFixture(page: Page, priorScore = 70) {
  await page.addInitScript(() => {
    sessionStorage.setItem('suvana.learn.entered', '1')
    localStorage.setItem('suvana.learn.onboarding-seen', '1')
    ;(window as unknown as { __mockHands: boolean }).__mockHands = true
    sessionStorage.setItem(
      'ssl-learn-session',
      JSON.stringify({
        id: 'synthetic-replay',
        glosses: ['BAG EKA'],
        done: [],
        startMastery: {},
        startedAt: new Date().toISOString(),
      }),
    )
  })
  await page.addInitScript(mockHandDetectionScript)
  await page.goto('./')
  await expect(page.locator('.path-card').first()).toBeVisible()
  await page.evaluate(
    (priorScore) =>
      new Promise<void>((resolve) => {
        const req = indexedDB.open('ssl-learn', 3)
        req.onsuccess = () => {
          const db = req.result,
            tx = db.transaction('attempts', 'readwrite')
          tx.objectStore('attempts').put({
            id: 'synthetic-history',
            gloss: 'BAG EKA',
            referenceId: 'fixture',
            score: priorScore,
            stage: 'try',
            worstFingers: [],
            createdAt: '2026-10-14T10:00:00Z',
          })
          tx.oncomplete = () => {
            db.close()
            resolve()
          }
        }
      }),
    priorScore,
  )
  await page.reload()
  await selectPractice(page)
  await page.getByRole('button', { name: 'Try this sign', exact: true }).click()
  await page.getByRole('button', { name: 'Turn on camera', exact: true }).click()
  await expect(page.locator('#aww-hands-pill')).toHaveAttribute('data-ready', 'yes', {
    timeout: 15000,
  })
  await page.getByRole('button', { name: 'Record attempt (Space)', exact: true }).click()
  await expect(
    page.locator('.practice-capture-controls button[aria-label="Stop and score (Space)"]'),
  ).toBeVisible({ timeout: 5000 })
  await page.waitForTimeout(350)
  await page
    .locator('.practice-capture-controls button[aria-label="Stop and score (Space)"]')
    .click()
  await expect(page.locator('.replay-compare')).toBeVisible()
}

test('Back from a completed session returns to the reference category', async ({ page }) => {
  await scoreFixture(page)
  await page.getByRole('button', { name: 'Back to Additional words (Esc)', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Additional words', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Watch BAG EKA/ })).toBeFocused()
})

test('comparison has one keyboard scrubber, a focus pause and no finger judgments', async ({
  page,
}) => {
  await scoreFixture(page)
  await page.getByRole('button', { name: 'Look at this moment', exact: true }).click()
  await expect(page.locator('.replay-compare')).toHaveAttribute('data-playing', 'false')
  await expect(page.locator('.replay-compare')).toHaveAttribute('data-focus', 'true')
  const scrubber = page.getByRole('slider', { name: 'Scrub both takes', exact: true })
  await scrubber.focus()
  await page.keyboard.press('End')
  const end = Number(await scrubber.inputValue())
  expect(end).toBeGreaterThan(0)
  await expect(page.locator('.replay-compare')).toHaveAttribute('data-step', String(end))
  await page.keyboard.press('Home')
  await expect(page.locator('.replay-compare')).toHaveAttribute('data-step', '0')
  await expect(page.getByRole('img', { name: 'Reference hand replay', exact: true })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Your hand replay', exact: true })).toBeVisible()
  await expect(page.locator('.finger-chip')).toHaveCount(0)
  expect(await page.locator('.practice-tips p').count()).toBeLessThanOrEqual(2)
})

test('tips fade behind Show tips for an improving sign', async ({ page }) => {
  await scoreFixture(page, 100)
  await expect(page.locator('.practice-tips summary')).toHaveText('Tips for your next try')
  await expect(page.locator('.practice-tips')).toHaveJSProperty('open', false)
  await page.locator('.practice-tips summary').click()
  await expect(page.locator('.practice-tips')).toHaveJSProperty('open', true)
})

test('comparison stays side by side and fits at 360 pixels with reduced motion', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await scoreFixture(page)
  await expect(page.locator('.replay-compare')).toHaveAttribute('data-playing', 'false')
  const boxes = await page.locator('.replay-panes canvas').evaluateAll((canvases) =>
    canvases.map((canvas) => {
      const rect = canvas.getBoundingClientRect()
      return { x: rect.x, y: rect.y, width: rect.width }
    }),
  )
  expect(boxes[1].y).toBe(boxes[0].y)
  expect(boxes[1].x).toBeGreaterThan(boxes[0].x)
  expect(boxes[0].x).toBeGreaterThanOrEqual(0)
  expect(boxes[0].x + boxes[0].width).toBeLessThanOrEqual(360)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('camera recovery from a result returns to the ready-to-record screen', async ({ page }) => {
  await scoreFixture(page)
  await page.evaluate(() => {
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)
    ;(window as unknown as { restoreCamera: () => void }).restoreCamera = () => {
      navigator.mediaDevices.getUserMedia = original
    }
    navigator.mediaDevices.getUserMedia = async () => {
      throw new DOMException('Test interruption', 'NotAllowedError')
    }
    const video = document.querySelector<HTMLVideoElement>('.practice-camera-card video')!
    for (const track of (video.srcObject as MediaStream).getTracks()) {
      track.stop()
      track.dispatchEvent(new Event('ended'))
    }
  })
  await expect(page.locator('.practice-camera-card')).toHaveAttribute('data-camera-status', 'error')
  await page.evaluate(() => (window as unknown as { restoreCamera: () => void }).restoreCamera())
  await page.getByRole('button', { name: 'Turn on camera', exact: true }).click()
  await expect(page.locator('.aww-practice-env')).toHaveAttribute('data-phase', 'idle')
  await expect(page.locator('#aww-hands-pill')).toHaveAttribute('data-ready', 'yes', {
    timeout: 15000,
  })
  await expect(
    page.getByRole('button', { name: 'Record attempt (Space)', exact: true }),
  ).toBeEnabled()
})
