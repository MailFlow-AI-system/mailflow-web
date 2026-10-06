import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { control, fixture, login } from './fixture'

test('real rate-limited selection announces the wait and preserves the composer draft', async ({
  page,
}) => {
  test.setTimeout(60000)
  await control('reset')
  const data = await fixture()
  await login(page, `http://${data.host}:3003/login`)
  await expect(page.getByRole('combobox', { name: 'Workspace: Acme Corp' })).toBeVisible()
  await page.getByRole('button', { name: 'Compose', exact: true }).click()
  await page
    .getByRole('textbox', { name: 'Assunto', exact: true })
    .fill('Preserve after rate limit')
  await page.getByRole('button', { name: 'Minimizar janela' }).click()
  const retryAfter = await page.evaluate(async () => {
    for (let index = 0; index < 125; index++) {
      const response = await fetch('/api/v1/workspaces', { cache: 'no-store' })
      await response.arrayBuffer()
      if (response.status === 429) return Number(response.headers.get('retry-after'))
      if (response.status !== 200) throw new Error('Unexpected local budget outcome')
    }
    throw new Error('Finite budget exercise did not reach the limit')
  })
  expect(retryAfter).toBeGreaterThan(0)
  expect(retryAfter).toBeLessThanOrEqual(60)
  await page.getByRole('combobox', { name: 'Workspace: Acme Corp' }).click()
  await page.getByRole('option', { name: 'Northwind' }).click()
  const rejected = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === '/api/v1/workspace-selection' &&
      response.status() === 429,
  )
  await page.getByRole('button', { name: 'Descartar e trocar' }).click()
  expect((await rejected).headers()['retry-after']).toMatch(/^\d+$/)
  await expect(page.getByRole('alertdialog').getByRole('alert')).toContainText(
    /Aguarde \d+ segundos/,
  )
  expect(
    (await new AxeBuilder({ page }).include('[role="alertdialog"]').analyze()).violations,
  ).toEqual([])
  expect(new URL(page.url()).hostname).toBe(data.host)
  const after = await fixture()
  expect(after.preference).toBeNull()
  expect(after.selections).toBe(0)
  await page.getByRole('button', { name: 'Continuar editando' }).click()
  await page.getByRole('button', { name: 'Restaurar mensagem' }).click()
  await expect(page.getByRole('textbox', { name: 'Assunto', exact: true })).toHaveValue(
    'Preserve after rate limit',
  )
})
