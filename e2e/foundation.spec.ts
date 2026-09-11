import { expect, test } from '@playwright/test'

test('renders the public foundation and opens the application shell', async ({ page }) => {
  await page.goto('/')

  await expect(
    page.getByRole('heading', {
      name: 'Email workflows, built on a dependable foundation.',
    }),
  ).toBeVisible()

  await page.getByRole('link', { name: 'Open application shell' }).click()

  await expect(page).toHaveURL('/app')
  await expect(page.getByRole('heading', { name: 'Application shell' })).toBeVisible()
})
