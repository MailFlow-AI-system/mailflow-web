import { expect, test } from '@playwright/test'
import { control, fixture, login, logout, selectNorthwind } from './fixture'

test.beforeEach(async () => {
  await control('reset')
})
test.setTimeout(60000)

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
  await otherTab.reload()
  await expect(otherTab.getByRole('combobox', { name: 'Workspace: Acme Corp' })).toBeVisible()
  expect(new URL(otherTab.url()).hostname).toBe(data.host)
  await page.reload()
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
