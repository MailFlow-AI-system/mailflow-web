import { expect, test } from '@playwright/test'
import { control, fixture, login } from './fixture'

test('six authenticated pages cold-start together with workspace authority enabled', async ({
  browser,
}) => {
  test.setTimeout(60000)
  await control('reset')
  const data = await fixture()
  const context = await browser.newContext()
  const loginPage = await context.newPage()
  // Sessions are host-only: sign in on both workspace hosts before the parallel cold start.
  // Splitting pages across hosts also stays under Chromium's per-host HTTP/1.1 connection cap.
  for (const host of [data.host, data.targetHost]) {
    await login(loginPage, `http://${host}:3003/login`)
    await expect(loginPage.getByRole('button', { name: 'Compose', exact: true })).toBeEnabled()
  }
  await loginPage.close()
  try {
    const pages = await Promise.all(Array.from({ length: 6 }, () => context.newPage()))
    const startupMs = await Promise.all(
      pages.map(async (page, index) => {
        const started = performance.now()
        const host = index % 2 ? data.targetHost : data.host
        const response = await page.goto(`http://${host}:3003/inbox`)
        expect(response?.status()).toBe(200)
        await expect(
          page.getByRole('combobox', {
            name: `Workspace: ${index % 2 ? 'Northwind' : 'Acme Corp'}`,
          }),
        ).toBeVisible({ timeout: 30000 })
        await expect(page.getByRole('button', { name: 'Compose', exact: true })).toBeEnabled()
        return Math.round(performance.now() - started)
      }),
    )
    console.info(
      JSON.stringify({ pages: pages.length, startupMs, maxStartupMs: Math.max(...startupMs) }),
    )
    const after = await fixture()
    expect(after.preference).toBeNull()
    expect(after.hasActiveOrganization).toBe(false)
    expect(after.globalMailCalls).toBe(0)
  } finally {
    await context.close()
  }
})
