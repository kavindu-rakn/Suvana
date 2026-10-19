import { test, expect } from '@playwright/test'
import { selectPractice, openPracticeSign } from './helpers/navigation'

test('Watch stays at 1x and Try opens the camera stage without requesting the camera', async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem('suvana.learn.entered', '1')
    localStorage.setItem('suvana.learn.onboarding-seen', '1')
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)
    ;(window as unknown as { cameraRequests: number }).cameraRequests = 0
    navigator.mediaDevices.getUserMedia = constraints => {
      ;(window as unknown as { cameraRequests: number }).cameraRequests++
      return original(constraints)
    }
  })
  await page.goto('./')
  await selectPractice(page)
  await openPracticeSign(page)
  await expect(page.locator('.aww-practice-env')).toHaveAttribute('data-stage', 'watch')
  await expect(page.getByRole('button', { name: 'Try this sign', exact: true })).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Turn on camera', exact: true })).not.toBeVisible()
  await page.waitForTimeout(5000)
  await expect(page.locator('.practice-reference-card .reference-content')).toHaveAttribute('data-speed', '1')
  expect(await page.evaluate(() => (window as unknown as { cameraRequests: number }).cameraRequests)).toBe(0)
  await page.getByRole('button', { name: 'Try this sign', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('.aww-practice-env')).toHaveAttribute('data-stage', 'try')
  await expect(page.getByRole('button', { name: 'Turn on camera', exact: true })).toBeVisible()
  expect(await page.evaluate(() => (window as unknown as { cameraRequests: number }).cameraRequests)).toBe(0)
  await page.getByRole('button', { name: 'Watch', exact: true }).click()
  await expect(page.locator('.aww-practice-env')).toHaveAttribute('data-stage', 'watch')
})
