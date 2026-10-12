import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { control, fixture, login } from './fixture'

test.beforeEach(async ({ page }) => {
  await control('reset')
  const data = await fixture()
  await login(page, `http://${data.host}:3003/login`)
  await expect(page.getByRole('combobox', { name: 'Workspace: Acme Corp' })).toBeVisible({
    timeout: 15000,
  })
})

test('selects B with a real shared HttpOnly cookie, persists preference, refreshes and blocks global mail', async ({
  page,
  context,
}, testInfo) => {
  const data = await fixture()
  await expect(
    page.getByRole('heading', { name: 'Workspace mail is not available yet' }),
  ).toBeVisible()
  await page.goto(`http://${data.host}:3003/sent?q=old-private#old-message`)
  await page.getByRole('combobox', { name: 'Workspace: Acme Corp' }).click()
  await page.screenshot({
    path: testInfo.outputPath('workspace-selector-dark.png'),
    animations: 'disabled',
  })
  await page.keyboard.press('Escape')
  await page.evaluate(() => {
    document.documentElement.classList.remove('dark')
    document.documentElement.dataset.theme = 'light'
    document.documentElement.style.colorScheme = 'light'
  })
  await page.getByRole('combobox', { name: 'Workspace: Acme Corp' }).click()
  expect(
    (await new AxeBuilder({ page }).include('[data-slot="select-content"]').analyze()).violations,
  ).toEqual([])
  await page.screenshot({
    path: testInfo.outputPath('workspace-selector-light.png'),
    animations: 'disabled',
  })
  await page.getByRole('option', { name: 'Northwind' }).click()
  await expect(page).toHaveURL(`http://${data.targetHost}:3003/sent`)
  await expect(page.getByRole('combobox', { name: 'Workspace: Northwind' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('combobox', { name: 'Workspace: Northwind' })).toBeVisible()
  const cookies = await context.cookies()
  const sessionCookie = cookies.find((cookie) => cookie.name.endsWith('session_token'))
  expect(sessionCookie).toMatchObject({
    domain: '.workspace.test',
    httpOnly: true,
    sameSite: 'Lax',
  })
  expect(
    (await context.cookies(`http://${data.targetHost}:3003`)).some(
      (cookie) => cookie.name === sessionCookie?.name,
    ),
  ).toBe(true)
  expect(await context.cookies('http://other-environment.test:3003')).toEqual([])
  const blocked = await page.evaluate(async () => (await fetch('/api/mail/messages')).status)
  expect(blocked).toBe(503)
  const direct = await fetch('http://127.0.0.1:8083/api/v1/mail/messages', {
    headers: { Cookie: `${sessionCookie?.name}=${sessionCookie?.value}` },
  })
  expect(direct.status).toBe(503)
  expect(await direct.json()).toMatchObject({ code: 'workspace_mail_unavailable' })
  const state = await fixture()
  expect(state.preference).toBe(data.targetId)
  expect(state.globalMailCalls).toBe(0)
  expect(state.hasActiveOrganization).toBe(false)
})

test('rechecks membership at the destination without trusting the committed preference', async ({
  page,
}) => {
  const data = await fixture()
  await control('revoke-after-selection')
  await page.getByRole('combobox', { name: 'Workspace: Acme Corp' }).click()
  await page.getByRole('option', { name: 'Northwind' }).click()
  await expect(page).toHaveURL(`http://${data.targetHost}:3003/inbox`)
  await expect(page.getByRole('heading', { name: 'Workspace unavailable' })).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Workspace: Northwind' })).toHaveCount(0)
  const state = await fixture()
  expect(state.preference).toBe(data.targetId)
  expect(state.globalMailCalls).toBe(0)
})

test('selects another workspace directly without composer draft confirmation', async ({ page }) => {
  const data = await fixture()
  await page.getByRole('button', { name: 'Compose', exact: true }).click()
  await page
    .getByRole('textbox', { name: 'Assunto', exact: true })
    .fill('Workspace scope regression')
  await page.getByRole('button', { name: 'Minimizar janela' }).click()
  await page.getByRole('combobox', { name: 'Workspace: Acme Corp' }).click()
  await page.getByRole('option', { name: 'Northwind' }).click()
  await expect(page).toHaveURL(`http://${data.targetHost}:3003/inbox`)
  await expect(page.getByRole('combobox', { name: 'Workspace: Northwind' })).toBeVisible()
  await expect(page.getByRole('alertdialog')).toHaveCount(0)
  expect((await fixture()).preference).toBe(data.targetId)
})

test('failed writes and stale memberships do not navigate or change the preference', async ({
  page,
}) => {
  const data = await fixture()
  await control('fail-next')
  await page.getByRole('combobox', { name: 'Workspace: Acme Corp' }).click()
  await page.getByRole('option', { name: 'Northwind' }).click()
  await expect(page.getByRole('alert')).toContainText('Workspace could not be changed. Try again.')
  expect(new URL(page.url()).hostname).toBe(data.host)
  expect((await fixture()).preference).toBeNull()
  await control('revoke-northwind')
  await page.getByRole('combobox', { name: 'Workspace: Acme Corp' }).click()
  await page.getByRole('option', { name: 'Northwind' }).click()
  await expect(page.getByRole('alert')).toContainText('Workspace could not be changed. Try again.')
  expect((await fixture()).preference).toBeNull()
  expect(new URL(page.url()).hostname).toBe(data.host)
})

test('rejects unrelated selectors and cross-origin submissions despite same-site cookies', async ({
  page,
}) => {
  const data = await fixture()
  const outcome = await page.evaluate(async (workspaceId) => {
    const response = await fetch('/api/v1/workspace-selection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId }),
    })
    return response.status
  }, data.unrelatedId)
  expect(outcome).toBe(404)
  expect((await fixture()).preference).toBeNull()
  const response = await fetch(`http://127.0.0.1:8083/api/v1/workspace-selection`, {
    method: 'POST',
    headers: { Origin: 'http://evil.workspace.test:3003', 'Content-Type': 'application/json' },
    body: JSON.stringify({ workspaceId: data.targetId }),
  })
  expect(response.status).toBe(401)
  await page.goto('http://evil.workspace.test:3003/inbox')
  const denied = await page.evaluate(async (workspaceId) => {
    const result = await fetch('/api/v1/workspace-selection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId }),
    })
    return result.status
  }, data.targetId)
  expect(denied).toBe(403)
  expect((await fixture()).preference).toBeNull()
})

test('mobile keyboard selection bootstraps the correct workspace', async ({ page }, testInfo) => {
  const data = await fixture()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Alternar barra lateral' }).click()
  const trigger = page.getByRole('combobox', { name: 'Workspace: Acme Corp' })
  await trigger.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('option', { name: 'Northwind' })).toBeVisible()
  expect(
    (await new AxeBuilder({ page }).include('[data-slot="select-content"]').analyze()).violations,
  ).toEqual([])
  await page.screenshot({
    path: testInfo.outputPath('workspace-switcher-mobile.png'),
    animations: 'disabled',
  })
  await page.getByRole('option', { name: 'Northwind' }).press('Enter')
  await expect(page).toHaveURL(`http://${data.targetHost}:3003/inbox`)
  // Wait for the new document's interactive shell, not just its SSR markup.
  await expect(page.getByRole('button', { name: 'Compose', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Alternar barra lateral' }).click()
  await expect(page.getByRole('combobox', { name: 'Workspace: Northwind' })).toBeVisible()
})
