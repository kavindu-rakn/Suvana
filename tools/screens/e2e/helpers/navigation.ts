import type { Page } from '@playwright/test'

/** Practice regressions explicitly choose Practice now that Path is the entry. */
export async function selectPractice(page: Page) {
  await page
    .getByRole('tab', { name: /Practice/ })
    .filter({ visible: true })
    .click()
}

/** Use the learner's global Spotlight search to open a real bundled sign. */
export async function openPracticeSign(page: Page, gloss = 'BAG EKA') {
  await page.getByRole('button', { name: 'Find a sign', exact: true }).click()
  const search = page.getByRole('combobox', { name: 'Find a sign', exact: true })
  await search.fill(gloss)
  await page.getByRole('option').first().waitFor()
  await search.press('Enter')
}

/** Open the real category containing our preview/player reference. */
export async function openPracticeCategory(page: Page, category = 'Additional words') {
  await page.locator('.practice-category').filter({ hasText: category }).click()
}

export async function startFirstLesson(page: Page) {
  await page.getByRole('button', { name: 'Start learning', exact: true }).click()
  await page.locator('.path-card').first().click()
  await page.getByRole('button', { name: 'Practise this unit', exact: true }).click()
}
