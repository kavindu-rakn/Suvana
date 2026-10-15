import { test, expect, type Page } from '@playwright/test'
import { mockHandDetectionScript } from './helpers/hands'

declare global {
  interface Window { cameraRequests: number; cameraStreams: MediaStream[]; testHidden: boolean }
}
async function prepare(page: Page) {
  await page.addInitScript(() => {
    sessionStorage.setItem('suvana.learn.entered', '1')
    localStorage.setItem('suvana.learn.onboarding-seen', '1')
    ;(window as unknown as { __mockHands: boolean }).__mockHands = true
    window.cameraRequests = 0
    window.cameraStreams = []
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)
    navigator.mediaDevices.getUserMedia = async constraints => {
      window.cameraRequests++
      const stream = await original(constraints)
      window.cameraStreams.push(stream)
      return stream
    }
  })
  await page.addInitScript(mockHandDetectionScript)
  await page.goto('./')
  await page.locator('button:has-text("Practise")').first().click()
  await page.getByRole('button', { name: 'My turn', exact: true }).click()
  await page.getByRole('button', { name: 'Turn on camera', exact: true }).click()
  await expect(page.locator('#aww-hands-pill')).toHaveAttribute('data-ready', 'yes', { timeout: 15000 })
}
async function visibility(page: Page, hidden: boolean) {
  await page.evaluate(hidden => {
    window.testHidden = hidden
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => window.testHidden })
    document.dispatchEvent(new Event('visibilitychange'))
    if (!hidden) {
      window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))
      window.dispatchEvent(new Event('focus'))
    }
  }, hidden)
}

test('browsing releases every camera track and return does not reopen it', async ({ page }) => {
  await prepare(page)
  await page.getByRole('button', { name: 'Choose a different sign (Esc)', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.cameraStreams.flatMap(stream => stream.getTracks()).every(track => track.readyState === 'ended'))).toBe(true)
  await expect(page.locator('.aww-pane-right')).toHaveAttribute('data-camera-status', 'idle')
  await visibility(page, true)
  await visibility(page, false)
  expect(await page.evaluate(() => window.cameraRequests)).toBe(1)
})

test('hidden streams stop and repeated returns restart exactly once without errors', async ({ page }) => {
  await prepare(page)
  for (let cycle = 0; cycle < 3; cycle++) {
    await visibility(page, true)
    await expect.poll(() => page.evaluate(() => window.cameraStreams.flatMap(stream => stream.getTracks()).every(track => track.readyState === 'ended'))).toBe(true)
    await visibility(page, false)
    await expect(page.locator('.aww-pane-right')).toHaveAttribute('data-camera-status', 'running', { timeout: 15000 })
    expect(await page.evaluate(() => window.cameraRequests)).toBe(cycle + 2)
    await expect(page.locator('.camera-error')).not.toBeVisible()
  }
})

test('leaving during countdown cancels unscored and restarts the camera on return', async ({ page }) => {
  await prepare(page)
  await page.getByRole('button', { name: 'Record attempt (Space)', exact: true }).click()
  await expect(page.locator('.aww-practice-env')).toHaveAttribute('data-phase', 'countdown')
  await visibility(page, true)
  await expect(page.locator('.aww-practice-env')).toHaveAttribute('data-phase', 'idle')
  await visibility(page, false)
  await expect(page.locator('.aww-pane-right')).toHaveAttribute('data-camera-status', 'running', { timeout: 15000 })
  await expect(page.locator('.aww-cam-notice')).toContainText('not scored')
})

test('manual stop revokes return intent and Watch also releases the stream', async ({ page }) => {
  await prepare(page)
  await page.getByRole('button', { name: 'Turn off camera', exact: true }).click()
  await visibility(page, true)
  await visibility(page, false)
  expect(await page.evaluate(() => window.cameraRequests)).toBe(1)
  await page.getByRole('button', { name: 'Turn on camera', exact: true }).click()
  await expect(page.locator('#aww-hands-pill')).toHaveAttribute('data-ready', 'yes', { timeout: 15000 })
  await page.getByRole('button', { name: '1. Watch', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.cameraStreams.flatMap(stream => stream.getTracks()).every(track => track.readyState === 'ended'))).toBe(true)
})

test('hover guidance stays off on a touch tablet', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1024, height: 768 }, isMobile: true, hasTouch: true })
  const page = await context.newPage()
  await page.addInitScript(() => sessionStorage.setItem('suvana.learn.entered', '1'))
  await page.goto('http://localhost:5194/learn/')
  expect(await page.evaluate(() => matchMedia('(hover: hover)').matches)).toBe(false)
  await expect(page.locator('.practice-hover-hint')).not.toBeVisible()
  await context.close()
})

test('L-29b blur-only ended-stream recovery still restarts the native hook', async ({ page }) => {
  await prepare(page)
  await page.evaluate(() => {
    window.dispatchEvent(new Event('blur'))
    for (const track of window.cameraStreams.at(-1)!.getTracks()) {
      track.stop()
      track.dispatchEvent(new Event('ended'))
    }
    window.dispatchEvent(new Event('focus'))
  })
  await expect(page.locator('.aww-pane-right')).toHaveAttribute('data-camera-status', 'running', { timeout: 15000 })
  await expect.poll(() => page.evaluate(() => window.cameraRequests)).toBe(2)
  await expect(page.locator('.camera-error')).not.toBeVisible()
})

test('bfcache pagehide/pageshow stops and restores without a visibility event', async ({ page }) => {
  await prepare(page)
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })))
  await expect.poll(() => page.evaluate(() => window.cameraStreams.flatMap(stream => stream.getTracks()).every(track => track.readyState === 'ended'))).toBe(true)
  await page.evaluate(() => {
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))
    window.dispatchEvent(new Event('focus'))
  })
  await expect(page.locator('.aww-pane-right')).toHaveAttribute('data-camera-status', 'running', { timeout: 15000 })
  expect(await page.evaluate(() => window.cameraRequests)).toBe(2)
})
