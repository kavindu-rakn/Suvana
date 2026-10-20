import { test, expect, type Page } from '@playwright/test'
import { writeFileSync } from 'node:fs'
import { mockHandDetectionScript } from './helpers/hands'
import { startFirstLesson } from './helpers/navigation'

async function shell(page: Page, theme = 'light') {
  await page.addInitScript(theme => localStorage.setItem('suvana.theme', theme), theme)
  await page.route('**/communicate/api/auth/session', route => route.fulfill({ json: {} }))
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' })
}

// Chromium may suspend DOM automation while a document navigation awaits its
// response. Observe the outgoing click in-page and capture the compositor.
async function observeNavigation(page: Page) {
  let snapshot: { visible: boolean; focused: boolean; cancelX: number; cancelY: number } | undefined
  page.on('console', message => {
    if (message.text().startsWith('load-sequence-snapshot:')) snapshot = JSON.parse(message.text().slice('load-sequence-snapshot:'.length))
  })
  await page.evaluate(() => document.addEventListener('click', () => {
    const overlay = document.querySelector<HTMLElement>('#navigation-loader')!
    if (overlay.hidden) return
    const cancel = overlay.querySelector<HTMLButtonElement>('[data-load-cancel]')!, rect = cancel.getBoundingClientRect()
    console.debug('load-sequence-snapshot:' + JSON.stringify({ visible: getComputedStyle(overlay).display === 'flex', focused: document.activeElement === cancel, cancelX: rect.x + rect.width / 2, cancelY: rect.y + rect.height / 2 }))
  }))
  const cdp = await page.context().newCDPSession(page)
  return { read: () => snapshot, capture: async (path: string) => {
    const result = await cdp.send('Page.captureScreenshot', { format: 'png' })
    writeFileSync(path, Buffer.from(result.data, 'base64'))
  } }
}

for (const width of [360, 390, 1280]) for (const theme of ['light', 'dark']) {
  test(`Shell arrival and sign-up wait at ${width}px in ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 800 })
    await shell(page, theme)
    await expect(page.locator('#navigation-loader')).toBeHidden()
    await expect(page.locator('.hero-suvana-en')).toHaveCSS('opacity', '1')
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.locator('#navigation-loader')).toBeHidden()
    let release!: () => void
    const gate = new Promise<void>(resolve => { release = resolve })
    let requested = false
    await page.route('**/register?callbackUrl*', async route => {
      requested = true
      await gate
      await route.fulfill({ contentType: 'text/html', body: '<h1>Create your account</h1><p>Delayed navigation fixture</p>' })
    })
    const observation = await observeNavigation(page)
    const click = page.getByRole('link', { name: 'Sign Up', exact: true }).click({ noWaitAfter: true })
    await expect.poll(() => requested).toBe(true)
    await expect.poll(() => observation.read()?.visible).toBe(true)
    expect(observation.read()?.focused).toBe(true)
    await observation.capture(`.agent-local/screens/load-sequence/signup-${width}-${theme}.png`)
    release()
    await click
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible()
    await page.goBack({ waitUntil: 'domcontentloaded' })
    await expect(page.locator('#navigation-loader')).toBeHidden()
    await expect(page.locator('.hero-suvana-en')).toBeVisible()
  })
}

test('Shell HTML is visible without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  try {
    const page = await context.newPage()
    await page.goto('http://localhost:5173/')
    await expect(page.locator('.hero-suvana-en')).toHaveCSS('opacity', '1')
    await expect(page.locator('#navigation-loader')).toBeHidden()
  } finally { await context.close() }
})

test('cancel sign-up waiting restores the Shell and focus', async ({ page }) => {
  await shell(page)
  let release!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  await page.route('**/register?callbackUrl*', async route => {
    await gate
    await route.abort().catch(() => {}) // Cancellation may already abort it.
  })
  const observation = await observeNavigation(page)
  const click = page.getByRole('link', { name: 'Sign Up', exact: true }).click({ noWaitAfter: true })
  await expect.poll(() => observation.read()?.visible).toBe(true)
  await page.mouse.click(observation.read()!.cancelX, observation.read()!.cancelY)
  release()
  await click
  await expect(page.locator('#navigation-loader')).toBeHidden()
  await expect(page.getByRole('link', { name: 'Sign Up', exact: true })).toBeFocused()
  await expect(page.locator('main')).not.toHaveAttribute('inert', '')
})

async function learnCamera(page: Page, theme: string, denied = false) {
  await page.addInitScript(({ theme, denied }) => {
    localStorage.setItem('suvana.theme', theme)
    localStorage.setItem('suvana.learn.onboarding-seen', '1')
    ;(window as unknown as { __mockHands: boolean }).__mockHands = true
    let release!: () => void
    const opened = new Promise<void>(resolve => { release = resolve })
    ;(window as unknown as { releaseCamera: () => void }).releaseCamera = release
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)
    navigator.mediaDevices.getUserMedia = async constraints => {
      if (denied) throw new DOMException('Permission denied', 'NotAllowedError')
      const stream = await original(constraints)
      ;(window as unknown as { permissionGranted: boolean }).permissionGranted = true
      ;(window as unknown as { cameraStream: MediaStream }).cameraStream = stream
      return stream
    }
    const play = HTMLMediaElement.prototype.play
    HTMLMediaElement.prototype.play = async function () {
      if (this instanceof HTMLVideoElement && this.srcObject) await opened
      return play.call(this)
    }
  }, { theme, denied })
  await page.addInitScript(mockHandDetectionScript)
  await page.goto('http://localhost:5174/learn/')
  await startFirstLesson(page)
  await page.getByRole('button', { name: 'Try this sign', exact: true }).click()
  await page.getByRole('button', { name: 'Turn on camera', exact: true }).click()
}

for (const width of [360, 390, 1280]) for (const theme of ['light', 'dark']) {
  test(`Learn mini loader follows camera readiness at ${width}px in ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 800 })
    await learnCamera(page, theme)
    await expect.poll(() => page.evaluate(() => (window as unknown as { permissionGranted: boolean }).permissionGranted)).toBe(true)
    const loader = page.locator('.camera-load-sequence')
    await expect(loader).toBeVisible()
    const rect = await loader.boundingBox()
    expect(rect!.width).toBeLessThan(300)
    expect(rect!.height).toBeLessThan(250)
    expect(rect!.x).toBeGreaterThanOrEqual(0)
    expect(rect!.x + rect!.width).toBeLessThanOrEqual(width)
    await page.screenshot({ path: `.agent-local/screens/load-sequence/after-camera-${width}-${theme}.png` })
    await page.evaluate(() => (window as unknown as { releaseCamera: () => void }).releaseCamera())
    await expect(page.locator('.practice-camera-card')).toHaveAttribute('data-camera-status', 'running', { timeout: 15000 })
    await expect(loader).toHaveCount(0)
    await expect(page.locator('.practice-camera-card video')).toBeVisible()
    await page.getByRole('button', { name: 'Turn off camera', exact: true }).click()
  })
}

test('Learn permission error removes the mini loader and offers retry', async ({ page }) => {
  await learnCamera(page, 'light', true)
  await expect(page.locator('.practice-camera-card')).toHaveAttribute('data-camera-status', 'error')
  await expect(page.locator('.camera-load-sequence')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Try again', exact: true })).toBeVisible()
})

test('Learn startup cancellation releases a granted stream and removes the loader', async ({ page }) => {
  await learnCamera(page, 'dark')
  await expect.poll(() => page.evaluate(() => (window as unknown as { permissionGranted: boolean }).permissionGranted)).toBe(true)
  await page.getByRole('button', { name: 'Cancel camera startup', exact: true }).click()
  await page.evaluate(() => (window as unknown as { releaseCamera: () => void }).releaseCamera())
  await expect(page.locator('.camera-load-sequence')).toHaveCount(0)
  await expect.poll(() => page.evaluate(() => (window as unknown as { cameraStream: MediaStream }).cameraStream.getTracks().every(track => track.readyState === 'ended'))).toBe(true)
  await expect(page.locator('.practice-camera-card')).toHaveAttribute('data-camera-status', 'idle')
})
