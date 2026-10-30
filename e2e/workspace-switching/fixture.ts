import { expect, type Page } from '@playwright/test'
import { matchesEntryUrl } from './entryUrl'
import type { SwitchingFixture } from './types'

export async function fixture(): Promise<SwitchingFixture> {
  return (await fetch('http://127.0.0.1:8083/__fixture')).json()
}
export async function control(action: string) {
  const data = await fixture()
  const response = await fetch('http://127.0.0.1:8083/__fixture/control', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-fixture-control': data.controlKey },
    body: JSON.stringify({ action }),
  })
  expect(response.ok).toBe(true)
}
export async function login(page: Page, url: string, email?: string) {
  const data = await fixture()
  await page.goto(url)
  const password = page.getByLabel('Password', { exact: true })
  await expect
    .poll(async () => {
      if ((await password.getAttribute('type')) === 'password')
        await page.getByRole('button', { name: 'Show password', exact: true }).click()
      return password.getAttribute('type')
    })
    .toBe('text')
  await page.getByLabel('Email', { exact: true }).fill(email ?? data.email)
  await password.fill(data.password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
}
export async function logout(page: Page) {
  await expect(page.getByRole('button', { name: 'Compose', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: /^Abrir menu de / }).click()
  await page.getByRole('menuitem', { name: 'Sign out', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Sign in to MailFlow' })).toBeVisible()
}
export async function selectNorthwind(page: Page) {
  await page.getByRole('combobox', { name: 'Workspace: Acme Corp' }).click()
  await page.getByRole('option', { name: 'Northwind' }).click()
  await expect(page.getByRole('combobox', { name: 'Workspace: Northwind' })).toBeVisible()
}

export async function expectEntryUrl(page: Page, expected: string) {
  await expect(page).toHaveURL((url) => matchesEntryUrl(url, expected))
}
