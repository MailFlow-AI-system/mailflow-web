import { expect, test } from '@playwright/test'
import { pauseWorkspaceResponse } from './delayedResponse'
import { control, fixture, login, logout } from './fixture'

test('a delayed committed selection cannot navigate the old tab after another identity logs in', async ({
  page,
  context,
}) => {
  test.setTimeout(60000)
  await control('reset')
  const data = await fixture()
  await login(page, `http://${data.host}:3003/login`)
  await expect(page.getByRole('combobox', { name: 'Workspace: Acme Corp' })).toBeVisible()
  const otherTab = await context.newPage()
  await otherTab.goto(`http://${data.host}:3003/sent`)
  await expect(otherTab.getByRole('combobox', { name: 'Workspace: Acme Corp' })).toBeVisible()
  const delay = await pauseWorkspaceResponse(page, '/api/v1/workspace-selection')
  try {
    await page.getByRole('combobox', { name: 'Workspace: Acme Corp' }).click()
    await page.getByRole('option', { name: 'Northwind' }).click()
    const response = await delay.paused
    expect(response.responseStatusCode).toBe(200)
    expect((await fixture()).preference).toBe(data.targetId)
    await logout(otherTab)
    await login(otherTab, `http://${data.targetHost}:3003/login`, data.otherEmail)
    await expect(otherTab.getByRole('button', { name: 'Abrir menu de Other User' })).toBeVisible()
    await page.evaluate(() => window.dispatchEvent(new Event('visibilitychange')))
  } finally {
    await delay.release()
  }
  await expect(page.getByRole('button', { name: 'Abrir menu de Other User' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Workspace unavailable' })).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Workspace: Acme Corp' })).toHaveCount(0)
  await expect(
    page.getByRole('combobox', { name: 'Workspace: Workspace unavailable' }),
  ).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Abrir menu de Workspace Test' })).toHaveCount(0)
  expect(new URL(page.url()).hostname).toBe(data.host)
  expect((await fixture()).preference).toBe(data.targetId)
  expect((await fixture()).globalMailCalls).toBe(0)
})
