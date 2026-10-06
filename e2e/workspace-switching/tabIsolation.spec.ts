import { expect, test } from '@playwright/test'
import { pauseWorkspaceResponse } from './delayedResponse'
import { control, fixture, login, logout, selectNorthwind } from './fixture'

test.beforeEach(async () => {
  await control('reset')
})
test.setTimeout(60000)

test('an unrelated explicit host denies URL and API access without following a preference', async ({
  page,
}) => {
  const data = await fixture()
  await login(page, `http://${data.host}:3003/login`)
  await expect(page.getByRole('combobox', { name: 'Workspace: Acme Corp' })).toBeVisible()
  await selectNorthwind(page)
  await page.goto(`http://${data.unrelatedHost}:3003/inbox`)
  await expect(page.getByRole('heading', { name: 'Workspace unavailable' })).toBeVisible()
  expect(new URL(page.url()).hostname).toBe(data.unrelatedHost)
  const result = await page.evaluate(async () => {
    const response = await fetch('/api/workspace-context', { cache: 'no-store' })
    return { status: response.status, body: await response.json() }
  })
  expect(result.status).toBe(404)
  expect(result.body).toMatchObject({ code: 'workspace_unavailable' })
  expect((await fixture()).preference).toBe(data.targetId)
})

test('a stale identity precondition cannot write a preference for a new session', async ({
  page,
}) => {
  const data = await fixture()
  await login(page, `http://${data.host}:3003/login`)
  await expect(page.getByRole('combobox', { name: 'Workspace: Acme Corp' })).toBeVisible()
  const identity = await page.evaluate(async () =>
    (await fetch('/api/workspace-context')).headers.get('x-workspace-identity'),
  )
  expect(identity).toBeTruthy()
  await logout(page)
  await login(page, `http://${data.targetHost}:3003/login`, data.otherEmail)
  await expect(page.getByRole('combobox', { name: 'Workspace: Northwind' })).toBeVisible()
  const status = await page.evaluate(
    async ({ identity, workspaceId }) => {
      const response = await fetch('/api/v1/workspace-selection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Workspace-Identity': identity ?? '' },
        body: JSON.stringify({ workspaceId }),
      })
      return response.status
    },
    { identity, workspaceId: data.targetId },
  )
  expect(status).toBe(403)
  expect((await fixture()).selections).toBe(0)
})

test('a real delayed response from the previous identity is rejected after login changes in another tab', async ({
  page,
  context,
}) => {
  const data = await fixture()
  await login(page, `http://${data.host}:3003/login`)
  await expect(page.getByRole('combobox', { name: 'Workspace: Acme Corp' })).toBeVisible()
  const otherTab = await context.newPage()
  const delay = await pauseWorkspaceResponse(otherTab)
  try {
    await otherTab.goto(`http://${data.targetHost}:3003/inbox`)
    const response = await delay.paused
    expect(response.responseStatusCode).toBe(200)
    expect(
      response.responseHeaders?.some(
        (header) => header.name.toLowerCase() === 'x-workspace-identity',
      ),
    ).toBe(true)
    await logout(page)
    await login(page, `http://${data.targetHost}:3003/login`, data.otherEmail)
    await expect(page.getByRole('button', { name: 'Abrir menu de Other User' })).toBeVisible()
  } finally {
    await delay.release()
  }
  await expect(otherTab.getByRole('button', { name: 'Abrir menu de Other User' })).toBeVisible()
  await expect(otherTab.getByRole('combobox', { name: 'Workspace: Northwind' })).toBeVisible()
  await expect(otherTab.getByRole('button', { name: 'Abrir menu de Workspace Test' })).toHaveCount(
    0,
  )
  await otherTab.getByRole('combobox', { name: 'Workspace: Northwind' }).click()
  await expect(otherTab.getByRole('option', { name: 'Acme Corp' })).toHaveCount(0)
  await expect(otherTab.getByRole('option', { name: 'Globex' })).toBeVisible()
})

test('session expiry on revalidation discards stale workspace authority without refreshing manually', async ({
  page,
}) => {
  const data = await fixture()
  await login(page, `http://${data.host}:3003/login`)
  await expect(page.getByRole('combobox', { name: 'Workspace: Acme Corp' })).toBeVisible()
  await control('expire-session')
  await page.evaluate(() => window.dispatchEvent(new Event('visibilitychange')))
  await expect(page.getByRole('heading', { name: 'Sign in to MailFlow' })).toBeVisible()
  await expect(page.getByRole('combobox')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Compose', exact: true })).toHaveCount(0)
})

test('focus revalidation removes revoked context without a full-page refresh', async ({
  page,
  context,
}) => {
  const data = await fixture()
  await login(page, `http://${data.targetHost}:3003/login`)
  await expect(page.getByRole('combobox', { name: 'Workspace: Northwind' })).toBeVisible()
  const otherTab = await context.newPage()
  await otherTab.goto(`http://${data.host}:3003/inbox`)
  await expect(otherTab.getByRole('combobox', { name: 'Workspace: Acme Corp' })).toBeVisible()
  await control('revoke-northwind')
  const revalidation = page.waitForResponse('**/api/workspace-context')
  await page.bringToFront()
  await page.evaluate(() => window.dispatchEvent(new Event('visibilitychange')))
  expect((await revalidation).status()).toBe(404)
  await expect(page.getByRole('heading', { name: 'Workspace unavailable' })).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Workspace: Northwind' })).toHaveCount(0)
})

test('revoking B does not revoke A, and refreshing B removes its authorized context', async ({
  page,
  context,
}) => {
  const data = await fixture()
  await login(page, `http://${data.host}:3003/login`)
  await expect(page.getByRole('combobox', { name: 'Workspace: Acme Corp' })).toBeVisible()
  const otherTab = await context.newPage()
  await otherTab.goto(`http://${data.targetHost}:3003/inbox`)
  await expect(otherTab.getByRole('combobox', { name: 'Workspace: Northwind' })).toBeVisible()
  await control('revoke-northwind')
  await otherTab.reload()
  await expect(otherTab.getByRole('heading', { name: 'Workspace unavailable' })).toBeVisible()
  await expect(otherTab.getByRole('combobox', { name: 'Workspace: Northwind' })).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('combobox', { name: 'Workspace: Acme Corp' })).toBeVisible()
  expect((await fixture()).globalMailCalls).toBe(0)
})

test('shared identity keeps each explicit host independent of preference writes in another tab', async ({
  page,
  context,
}) => {
  const data = await fixture()
  await login(page, `http://${data.host}:3003/login`)
  await expect(page.getByRole('combobox', { name: 'Workspace: Acme Corp' })).toBeVisible()
  const otherTab = await context.newPage()
  await otherTab.goto(`http://${data.host}:3003/sent`)
  await expect(otherTab.getByRole('combobox', { name: 'Workspace: Acme Corp' })).toBeVisible()
  await selectNorthwind(page)
  await Promise.all([otherTab.reload(), page.reload()])
  await expect(otherTab.getByRole('combobox', { name: 'Workspace: Acme Corp' })).toBeVisible()
  expect(new URL(otherTab.url()).hostname).toBe(data.host)
  await expect(page.getByRole('combobox', { name: 'Workspace: Northwind' })).toBeVisible()
  expect(new URL(page.url()).hostname).toBe(data.targetHost)
  expect((await fixture()).preference).toBe(data.targetId)
  expect((await fixture()).hasActiveOrganization).toBe(false)
  expect((await fixture()).globalMailCalls).toBe(0)
})

test('logout and a different identity cannot recover the previous identity on another tab refresh', async ({
  page,
  context,
}) => {
  const data = await fixture()
  await login(page, `http://${data.host}:3003/login`)
  await expect(page.getByRole('combobox', { name: 'Workspace: Acme Corp' })).toBeVisible()
  const otherTab = await context.newPage()
  await otherTab.goto(`http://${data.host}:3003/inbox`)
  await expect(otherTab.getByRole('combobox', { name: 'Workspace: Acme Corp' })).toBeVisible()
  await logout(page)
  await otherTab.reload()
  await expect(otherTab.getByRole('heading', { name: 'Sign in to MailFlow' })).toBeVisible()
  await login(page, `http://${data.targetHost}:3003/login`, data.otherEmail)
  await expect(page.getByRole('combobox', { name: 'Workspace: Northwind' })).toBeVisible()
  await otherTab.goto(`http://${data.host}:3003/inbox`)
  await expect(otherTab.getByRole('heading', { name: 'Workspace unavailable' })).toBeVisible()
  await expect(otherTab.getByRole('combobox', { name: 'Workspace: Acme Corp' })).toHaveCount(0)
  expect((await fixture()).globalMailCalls).toBe(0)
})
