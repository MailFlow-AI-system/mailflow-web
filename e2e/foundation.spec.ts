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

test('captures sanitized TanStack navigation telemetry', async ({ page }) => {
  const envelopes: unknown[] = []

  await page.route('http://127.0.0.1:4318/collect', async (route) => {
    envelopes.push(JSON.parse(route.request().postData() ?? '{}'))
    await route.fulfill({ status: 204, body: '' })
  })

  await page.goto('/?email=person%40example.test')
  await page.getByRole('link', { name: 'Open application shell' }).click()
  await expect(page).toHaveURL('/app')
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
