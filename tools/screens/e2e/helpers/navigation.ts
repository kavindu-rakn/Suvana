import type { Page } from '@playwright/test'

/** Practice regressions explicitly choose Practice now that Path is the entry. */
export async function selectPractice(page: Page) {
  await page.getByRole('tab', { name: /Practice/ }).filter({ visible: true }).click()
}

export async function startFirstLesson(page: Page) {
  await page.getByRole('button', { name: 'Start learning', exact: true }).click()
  await page.locator('.path-card').first().click()
  await page.getByRole('button', { name: 'Practise this unit', exact: true }).click()
}
