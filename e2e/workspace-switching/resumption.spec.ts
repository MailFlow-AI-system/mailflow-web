import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { control, expectEntryUrl, fixture, login, logout, selectNorthwind } from './fixture'

test.beforeEach(async () => {
  await control('reset')
})
test.setTimeout(60000)

test('generic login without a preference uses a deterministic live fallback without writing selection', async ({
  page,
}) => {
  const data = await fixture()
  await login(page, 'http://localhost:3003/login')
  await expectEntryUrl(page, `http://${data.fallbackHost}:3003/inbox`)
  await expect(page.getByRole('combobox', { name: /^Workspace: / })).toBeVisible()
  expect((await fixture()).preference).toBeNull()
  expect((await fixture()).selections).toBe(0)
  await page.reload()
  await expectEntryUrl(page, `http://${data.fallbackHost}:3003/inbox`)
})

test('select B, refresh, sign out and generic login resumes B; direct A still wins', async ({
  page,
}) => {
  const data = await fixture()
  await login(page, `http://${data.host}:3003/login`)
  await expect(page.getByRole('combobox', { name: 'Workspace: Acme Corp' })).toBeVisible()
  await selectNorthwind(page)
  await page.reload()
  await expect(page.getByRole('combobox', { name: 'Workspace: Northwind' })).toBeVisible()
  await logout(page)
  await login(page, 'http://localhost:3003/login')
  await expectEntryUrl(page, `http://${data.targetHost}:3003/inbox`)
  await expect(page.getByRole('combobox', { name: 'Workspace: Northwind' })).toBeVisible()
  await page.goto(`http://${data.host}:3003/sent`)
  await expect(page.getByRole('combobox', { name: 'Workspace: Acme Corp' })).toBeVisible()
  await page.reload()
  await expectEntryUrl(page, `http://${data.host}:3003/sent`)
  await expect(page.getByRole('combobox', { name: 'Workspace: Acme Corp' })).toBeVisible()
  expect((await fixture()).preference).toBe(data.targetId)
  expect((await fixture()).selections).toBe(1)
  expect((await fixture()).globalMailCalls).toBe(0)
})

test('a revoked preference falls back on generic entry only, stripping queries and keeping the old preference non-authoritative', async ({
  page,
}) => {
  const data = await fixture()
  await login(page, `http://${data.host}:3003/login`)
  await expect(page.getByRole('combobox', { name: 'Workspace: Acme Corp' })).toBeVisible()
  await selectNorthwind(page)
  await control('revoke-northwind')
  await page.goto('http://localhost:3003/sent?q=private&redirect=https://evil.test#private')
  await expectEntryUrl(page, `http://${data.host}:3003/sent`)
  await expect(page.getByRole('combobox', { name: 'Workspace: Acme Corp' })).toBeVisible()
  expect((await fixture()).preference).toBe(data.targetId)
  await page.goto(`http://${data.targetHost}:3003/inbox`)
  await expect(page.getByRole('heading', { name: 'Workspace unavailable' })).toBeVisible()
  expect(new URL(page.url()).hostname).toBe(data.targetHost)
})

test('an identity with no memberships gets an accessible empty state without a composer or global mail', async ({
  page,
}, testInfo) => {
  const data = await fixture()
  await login(page, 'http://localhost:3003/login', data.emptyEmail)
  await expect(page.getByRole('heading', { name: 'No workspace available' })).toBeVisible()
  await expectEntryUrl(page, 'http://localhost:3003/inbox')
  await expect(page.getByRole('combobox')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Compose', exact: true })).toHaveCount(0)
  expect((await new AxeBuilder({ page }).include('section').analyze()).violations).toEqual([])
  await page.screenshot({ path: testInfo.outputPath('entry-empty-dark.png') })
  await page.evaluate(() => {
    document.documentElement.classList.remove('dark')
    document.documentElement.dataset.theme = 'light'
  })
  await page.screenshot({ path: testInfo.outputPath('entry-empty-light.png') })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: testInfo.outputPath('entry-empty-mobile.png') })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  expect((await fixture()).globalMailCalls).toBe(0)
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Sign in to MailFlow' })).toBeVisible()
})

test('a failed entry stays generic and permits retry without optimistic tenant content', async ({
  page,
}) => {
  const data = await fixture()
  await login(page, `http://${data.host}:3003/login`)
  await expect(page.getByRole('combobox', { name: 'Workspace: Acme Corp' })).toBeVisible()
  await selectNorthwind(page)
  await control('fail-next-entry')
  await page.goto('http://localhost:3003/inbox')
  await expect(page.getByRole('heading', { name: 'Workspace unavailable' })).toBeVisible()
  expect(new URL(page.url()).hostname).toBe('localhost')
  await expect(page.getByRole('button', { name: 'Compose', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Try again' }).click()
  await expectEntryUrl(page, `http://${data.targetHost}:3003/inbox`)
  await expect(page.getByRole('combobox', { name: 'Workspace: Northwind' })).toBeVisible()
})

test('a new identity cannot reuse the previous identity preference or cached workspace', async ({
  page,
}) => {
  const data = await fixture()
  await login(page, `http://${data.host}:3003/login`)
  await expect(page.getByRole('combobox', { name: 'Workspace: Acme Corp' })).toBeVisible()
  expect(
    await page.evaluate(
      async (workspaceId) =>
        (
          await fetch('/api/v1/workspace-selection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workspaceId }),
          })
        ).status,
      data.currentId,
    ),
  ).toBe(200)
  await logout(page)
  await login(page, `http://${data.targetHost}:3003/login`, data.otherEmail)
  await expect(page.getByRole('combobox', { name: 'Workspace: Northwind' })).toBeVisible()
  expect(
    await page.evaluate(
      async (workspaceId) =>
        (
          await fetch('/api/v1/workspace-selection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workspaceId }),
          })
        ).status,
      data.targetId,
    ),
  ).toBe(200)
  await logout(page)
  await login(page, 'http://localhost:3003/login', data.otherEmail)
  await expectEntryUrl(page, `http://${data.targetHost}:3003/inbox`)
  await expect(
    page.getByRole('button', { name: 'Abrir menu de Other User', exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('option', { name: 'Acme Corp' })).toHaveCount(0)
  await page.getByRole('combobox', { name: 'Workspace: Northwind' }).click()
  await expect(page.getByRole('option', { name: 'Acme Corp' })).toHaveCount(0)
  expect((await fixture()).preference).toBe(data.currentId)
})

test('an expired session requires login, preserves only a safe collection and rejects pre-auth discovery', async ({
  page,
}) => {
  const data = await fixture()
  await page.goto('http://localhost:3003/login')
  expect(await page.evaluate(async () => (await fetch('/api/v1/workspace-entry')).status)).toBe(401)
  await login(page, `http://${data.host}:3003/login`)
  await expect(page.getByRole('combobox', { name: 'Workspace: Acme Corp' })).toBeVisible()
  await selectNorthwind(page)
  await expect(
    page
      .getByRole('region', { name: 'Message reader', exact: true })
      .getByRole('heading', { name: 'Northwind private message', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('region', { name: 'Inbox message list', exact: true }),
  ).toHaveAttribute('aria-busy', 'false')
  await control('expire-session')
  await page.goto('http://localhost:3003/sent?q=private#message-id')
  await expect(page.getByRole('heading', { name: 'Sign in to MailFlow' })).toBeVisible()
  await expectEntryUrl(page, 'http://localhost:3003/login?returnTo=%2Fsent')
  await login(page, page.url())
  await expectEntryUrl(page, `http://${data.targetHost}:3003/sent`)
  await expect(page.getByRole('combobox', { name: 'Workspace: Northwind' })).toBeVisible()
})
