import { expect, type Locator, type Page } from '@playwright/test'

const MAX_TAB_STEPS = 40

export async function reachByTab(page: Page, target: Locator) {
  await expect(target).toBeVisible()
  for (let step = 0; step < MAX_TAB_STEPS; step++) {
    if (await target.evaluate((element) => document.activeElement === element)) return
    await page.keyboard.press('Tab')
  }
  throw new Error('QA target was not reachable through the bounded Tab sequence')
}

export async function highlightNorthwind(page: Page) {
  const options = page.getByRole('option')
  const index = await options.evaluateAll((elements) =>
    elements.findIndex((element) => element.textContent?.includes('Northwind')),
  )
  expect(index).toBeGreaterThanOrEqual(0)
  await page.keyboard.press('End')
  await page.keyboard.press('ArrowUp')
  await page.keyboard.press('Home')
  for (let step = 0; step < index; step++) await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('option', { name: 'Northwind', exact: true })).toHaveAttribute(
    'data-highlighted',
    '',
  )
}

export async function expectNoHorizontalOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
}
