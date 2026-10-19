import { expect, type Locator } from '@playwright/test'

/** Use the real stock Video.js menu, including its nested speed submenu. */
export async function chooseReferenceSpeed(player: Locator, speed: string) {
  await player.getByRole('button', { name: 'Settings', exact: true }).click()
  await player.getByRole('menuitem', { name: /^Speed / }).click()
  const option = player.getByRole('menuitemradio', { name: `${speed}×`, exact: true })
  await option.click()
  await expect(player.locator('.reference-content')).toHaveAttribute('data-speed', speed)
  const settings = player.getByRole('button', { name: 'Settings', exact: true })
  if (await settings.getAttribute('aria-expanded') === 'true') await settings.click()
}
