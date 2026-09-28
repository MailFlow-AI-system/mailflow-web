import { expect, test } from '@playwright/test'

test('redirects an unauthenticated visitor to login', async ({ page }) => {
  const consoleWarnings: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'warning') consoleWarnings.push(message.text())
  })
  await page.goto('/')
  await expect(page).toHaveURL('/login')
  await expect(page.getByRole('heading', { name: 'Sign in to MailFlow' })).toBeVisible()
  await page.goto('/inbox')
  await expect(page).toHaveURL('/login')
  expect(consoleWarnings.join('\n')).not.toContain('nativeButton')
})

test('shows a 404 for an unknown route', async ({ page }) => {
  const response = await page.goto('/does-not-exist')

  expect(response?.status()).toBe(404)
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()

  const removedRoute = await page.goto('/app')
  expect(removedRoute?.status()).toBe(404)
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
})

test('captures sanitized TanStack navigation telemetry', async ({ page }) => {
  const envelopes: unknown[] = []

  await page.route('http://127.0.0.1:4318/collect', async (route) => {
    envelopes.push(JSON.parse(route.request().postData() ?? '{}'))
    await route.fulfill({ status: 204, body: '' })
  })

  await page.goto('/login?email=person%40example.test')
  await expect
    .poll(() => JSON.stringify(envelopes), { timeout: 10_000 })
    .toMatch(/"name":"session_(start|resume)"/)
  await page.getByRole('link', { name: 'Forgot password?' }).click()
  await expect(page).toHaveURL('/forgot-password')
  await expect
    .poll(() => JSON.stringify(envelopes), { timeout: 10_000 })
    .toContain('mailflow.navigation')

  const serialized = JSON.stringify(envelopes)
  expect(serialized).toContain('mailflow.navigation')
  expect(serialized).not.toContain('person@example.test')
})

test('captures controlled browser errors without private content', async ({ page }) => {
  const envelopes: unknown[] = []

  await page.route('http://127.0.0.1:4318/collect', async (route) => {
    envelopes.push(JSON.parse(route.request().postData() ?? '{}'))
    await route.fulfill({ status: 204, body: '' })
  })

  await page.goto('/')
  await expect
    .poll(() => JSON.stringify(envelopes), { timeout: 10_000 })
    .toMatch(/"name":"session_(start|resume)"/)
  await page.evaluate(() => {
    window.setTimeout(() => {
      throw new Error('private message body 92615')
    }, 0)
  })
  await expect
    .poll(() => JSON.stringify(envelopes), { timeout: 10_000 })
    .toContain('"value":"[redacted]"')

  const serialized = JSON.stringify(envelopes)
  expect(serialized).toContain('"value":"[redacted]"')
  expect(serialized).not.toContain('private message body 92615')
})
