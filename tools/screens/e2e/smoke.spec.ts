import { test, expect } from '@playwright/test'

import { mockHandDetectionScript } from './helpers/hands'
import { selectPractice, startFirstLesson } from './helpers/navigation'

test.describe('Learn smoke tests', () => {
  test('onboarding shows on first run', async ({ page }) => {
    // Fresh session: no entered flag, no onboarding-seen flag
    await page.goto('./')

    // Arrive through Path and explicitly start the first lesson.
    await startFirstLesson(page)

    // First sign chosen triggers the modal Onboarding guide (<dialog class="onb">)
    const dialog = page.locator('dialog.onb')
    await expect(dialog).toBeVisible()
    await expect(dialog.locator('.onb-count')).toContainText('How it works · 1 of 3')

    // Close the onboarding guide
    await dialog.locator('button.onb-close').click()
    await expect(dialog).not.toBeVisible()

    // Reload the page: with onboarding-seen recorded, onboarding must not show again
    await page.reload()
    await expect(page.locator('dialog.onb')).not.toBeVisible()
    await expect(page.locator('.path-card').first()).toBeVisible()
  })

  test('Esc during countdown stays in Practice', async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem('suvana.learn.entered', '1')
      localStorage.setItem('suvana.learn.onboarding-seen', '1')
      ;(window as unknown as { __mockHands?: boolean }).__mockHands = true
    })
    await page.addInitScript(mockHandDetectionScript)

    await page.goto('./')
    await selectPractice(page)
    await expect(page.locator('.aww-practice-env')).toBeVisible()

    // Select a sign to practice
    const practiseBtn = page.getByRole('button', { name: /Practise/ }).first()
    await expect(practiseBtn).toBeVisible()
    await practiseBtn.click()

    // Start camera tracking
    await page.getByRole('button', { name: 'My turn', exact: true }).click()
    const turnOnCamBtn = page.locator('button:has-text("Turn on camera")')
    await expect(turnOnCamBtn).toBeVisible()
    await turnOnCamBtn.click()

    // Wait for hands to be ready (pill says "Hands in frame")
    const handsPill = page.locator('#aww-hands-pill')
    await expect(handsPill).toHaveAttribute('data-ready', 'yes', { timeout: 10000 })

    // Trigger countdown via Record button
    const recordBtn = page.locator('button.aww-cam-btn:has-text("Record")')
    await expect(recordBtn).toBeEnabled()
    await recordBtn.click()

    // Countdown is active: Cancel button is present
    const cancelBtn = page.locator('button[aria-label*="Cancel countdown"]')
    await expect(cancelBtn).toBeVisible()

    // Press Escape during countdown
    await page.keyboard.press('Escape')

    // Countdown is cancelled: Cancel button gone, Record button is back
    await expect(cancelBtn).not.toBeVisible()
    await expect(page.locator('button.aww-cam-btn:has-text("Record")')).toBeVisible()

    // Verify we stayed in Practice (did not get thrown back to Hero)
    await expect(page.locator('.aww-practice-env')).toBeVisible()
    await expect(page.locator('.aww-hero-mark')).not.toBeVisible()
  })

  test('Enter on a focused Retry retries', async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem('suvana.learn.entered', '1')
      localStorage.setItem('suvana.learn.onboarding-seen', '1')
      ;(window as unknown as { __mockHands?: boolean }).__mockHands = true
    })
    await page.addInitScript(mockHandDetectionScript)

    await page.goto('./')
    await selectPractice(page)
    await expect(page.locator('.aww-practice-env')).toBeVisible()

    // Select a sign to practice
    const practiseBtn = page.getByRole('button', { name: /Practise/ }).first()
    await expect(practiseBtn).toBeVisible()
    await practiseBtn.click()

    // Start camera tracking
    await page.getByRole('button', { name: 'My turn', exact: true }).click()
    const turnOnCamBtn = page.locator('button:has-text("Turn on camera")')
    await expect(turnOnCamBtn).toBeVisible()
    await turnOnCamBtn.click()

    // Wait for hands ready and start recording
    const handsPill = page.locator('#aww-hands-pill')
    await expect(handsPill).toHaveAttribute('data-ready', 'yes', { timeout: 10000 })

    const recordBtn = page.locator('button.aww-cam-btn:has-text("Record")')
    await recordBtn.click()

    // Wait for recording phase (Stop & Score button appears)
    const stopBtn = page.locator('button.aww-cam-btn-stop')
    await expect(stopBtn).toBeVisible({ timeout: 5000 })

    // Stop recording and transition to result phase
    await stopBtn.click()

    // Result panel appears with Retry button
    const retryBtn = page.locator('button.aww-btn-retry')
    await expect(retryBtn).toBeVisible({ timeout: 10000 })

    await expect.poll(() => page.evaluate(() => performance.getEntriesByName('suvana:result-shown').length)).toBe(1)
    const marks = await page.evaluate(() => ['suvana:capture-end', 'suvana:result-shown'].map(name => performance.getEntriesByName(name)[0]?.startTime))
    expect(marks[1]).toBeGreaterThanOrEqual(marks[0])
    const savedStages = await page.evaluate(() => new Promise<string[]>((resolve, reject) => {
      const req = indexedDB.open('ssl-learn', 3)
      req.onerror = () => reject(req.error)
      req.onsuccess = () => {
        const db = req.result, tx = db.transaction('attempts'), all = tx.objectStore('attempts').getAll()
        all.onsuccess = () => resolve(all.result.map(entry => entry.stage))
        tx.oncomplete = () => db.close()
      }
    }))
    expect(savedStages).toEqual(['try'])

    // Focus the Retry button
    await retryBtn.focus()
    await expect(retryBtn).toBeFocused()

    // Press Enter while Retry is focused
    await page.keyboard.press('Enter')

    // Enter on focused Retry starts a new countdown rather than navigating away
    const cancelBtn = page.locator('button[aria-label*="Cancel countdown"]')
    await expect(cancelBtn).toBeVisible({ timeout: 5000 })
    await expect(page.locator('.aww-practice-env')).toBeVisible()
  })

  test('blocked IndexedDB (addInitScript) still renders the sign list with a notice', async ({
    page,
  }) => {
    // Simulate blocked site storage (SecurityError on indexedDB.open)
    await page.addInitScript(() => {
      sessionStorage.setItem('suvana.learn.entered', '1')
      localStorage.setItem('suvana.learn.onboarding-seen', '1')
      localStorage.setItem('ssl-learn-mode', 'author')
      window.indexedDB.open = () => {
        throw new DOMException('The operation is insecure.', 'SecurityError')
      }
    })

    // Navigate to Learn in author mode
    await page.goto('./?mode=author')
    const libraryTabBtn = page.locator('.aww-nav-tab').filter({ hasText: 'Library' }).first()
    await expect(libraryTabBtn).toBeVisible()
    await libraryTabBtn.click()

    // Non-blocking storage notice is displayed
    const notice = page.locator('.storage-notice')
    await expect(notice).toBeVisible()
    await expect(notice).toContainText('Progress can’t be saved in this browser')

    // Bundled signs are still rendered in the library list
    const libraryHead = page.locator('.library-head')
    await expect(libraryHead).toBeVisible()
    await expect(libraryHead.locator('.library-count')).toContainText('bundled')
    const rows = page.locator('.rec-row')
    await expect(rows.first()).toBeVisible()
    expect(await rows.count()).toBeGreaterThan(0)
  })
})
