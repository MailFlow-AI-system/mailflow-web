import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  const response = await fetch('http://127.0.0.1:8081/__fixture')
  if (!response.ok)
    throw new Error('Start the dedicated Core workspace test server before running browser tests')
  const fixture = await response.json()
  await page.goto(`http://${fixture.host}:3001/login`)
  await expect
    .poll(
      async () => {
        const password = page.getByLabel('Password', { exact: true })
        if ((await password.getAttribute('type')) === 'password') {
          await page.getByRole('button', { name: 'Show password', exact: true }).click()
        }
        return password.getAttribute('type')
      },
      { timeout: 15000 },
    )
    .toBe('text')
  await page.getByLabel('Email', { exact: true }).fill(fixture.email)
  await page.getByLabel('Password', { exact: true }).fill(fixture.password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('combobox', { name: 'Workspace: Acme Corp' })).toBeVisible({
    timeout: 15000,
  })
})

test('real Core returns A/B, current is highlighted, keyboard closes and no C leaks', async ({
  page,
}, testInfo) => {
  const trigger = page.getByRole('combobox', { name: 'Workspace: Acme Corp' })
  // Requests must run in Chromium, where the isolated test-zone DNS mapping applies.
  const responses = await page.evaluate(async () =>
    Promise.all(
      ['/api/v1/workspaces', '/inbox'].map(async (path) => {
        const response = await fetch(path, { credentials: 'same-origin', cache: 'no-store' })
        return { status: response.status, cacheControl: response.headers.get('cache-control') }
      }),
    ),
  )
  expect(responses[0]).toEqual({ status: 200, cacheControl: 'private, no-store' })
  expect(responses[1].status).toBe(200)
  expect(responses[1].cacheControl).toContain('no-store')
  await page.evaluate(() => {
    document.documentElement.classList.remove('dark')
    document.documentElement.dataset.theme = 'light'
    document.documentElement.style.colorScheme = 'light'
  })
  await trigger.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('option', { name: 'Acme Corp' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect(page.getByRole('option', { name: 'Northwind' })).toBeVisible()
  await expect(page.getByRole('option', { name: 'Globex' })).toHaveCount(0)
  const scan = await new AxeBuilder({ page }).include('[data-slot="select-content"]').analyze()
  expect(scan.violations).toEqual([])
  await page.screenshot({
    path: testInfo.outputPath('workspace-desktop-light.png'),
    animations: 'disabled',
  })
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
  await page.evaluate(() => {
    document.documentElement.classList.add('dark')
    document.documentElement.dataset.theme = 'dark'
    document.documentElement.style.colorScheme = 'dark'
  })
  await trigger.click()
  await expect(page.getByRole('option', { name: 'Northwind' })).toBeVisible()
  await page.screenshot({
    path: testInfo.outputPath('workspace-desktop-dark.png'),
    animations: 'disabled',
  })
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Alternar barra lateral' }).first().click()
  await expect(trigger).toBeVisible()
  await trigger.click()
  await expect(page.getByRole('option', { name: 'Northwind' })).toBeVisible()
  await page.screenshot({
    path: testInfo.outputPath('workspace-collapsed.png'),
    animations: 'disabled',
  })
})

test('workspace selector remains accessible in the mobile sidebar', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Alternar barra lateral' }).click()
  await page.getByRole('combobox', { name: 'Workspace: Acme Corp' }).click()
  await expect(page.getByRole('option', { name: 'Northwind' })).toBeVisible()
  await page.screenshot({
    path: testInfo.outputPath('workspace-mobile.png'),
    animations: 'disabled',
  })
  await page.keyboard.press('Escape')
  await expect(page.getByRole('combobox', { name: 'Workspace: Acme Corp' })).toBeFocused()
})

test('an authenticated identity cannot bootstrap an unrelated workspace', async ({
  page,
  context,
}) => {
  const fixture = await (await fetch('http://127.0.0.1:8081/__fixture')).json()
  const cookies = await context.cookies()
  await context.addCookies(cookies.map((cookie) => ({ ...cookie, domain: fixture.globexHost })))
  await page.goto(`http://${fixture.globexHost}:3001/inbox`)
  await expect(page.getByRole('heading', { name: 'Workspace unavailable' })).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Workspace: Acme Corp' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Try again', exact: true }).last()).toBeVisible()
})
