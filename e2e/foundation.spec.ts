import { expect, test } from '@playwright/test'

test('renders the public foundation and opens the application shell', async ({ page }) => {
  await page.goto('/')

  await expect(
    page.getByRole('heading', {
      name: 'Email workflows, built on a dependable foundation.',
    }),
  ).toBeVisible()

  await page.getByRole('button', { name: 'Open application shell' }).click()

  await expect(page).toHaveURL('/app')
  await expect(page.getByRole('heading', { name: 'Application shell' })).toBeVisible()
})

test('applies a saved light theme before hydration', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('mailflow-theme', 'light')
  })

  await page.route('**/*', async (route) => {
    if (route.request().resourceType() === 'script') {
      await route.abort()
      return
    }

    await route.continue()
  })

  await page.goto('/')

  const html = page.locator('html')
  await expect(html).toHaveAttribute('data-theme', 'light')
  await expect(html).not.toHaveClass('dark')
  await expect(html).toHaveCSS('color-scheme', 'light')
  await expect(
    page.getByRole('heading', {
      name: 'Email workflows, built on a dependable foundation.',
    }),
  ).toBeVisible()
})
