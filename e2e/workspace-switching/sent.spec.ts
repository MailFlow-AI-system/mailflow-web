import { expect, test } from '@playwright/test'
import { control, fixture, login } from './fixture'

test.setTimeout(60000)
test.beforeEach(async () => {
  await control('reset')
  await control('reset-sent')
})

test('isolates sent messages and pagination across workspace tabs and refresh', async ({
  page,
  context,
}) => {
  const data = await fixture()
  await login(page, `http://${data.host}:3003/login`)
  await expect(page.getByRole('heading', { name: 'Inbox', exact: true })).toBeVisible({
    timeout: 15000,
  })
  await page.goto(`http://${data.host}:3003/sent`)
  await expect(page.getByText('Acme sent message 21', { exact: true })).toBeVisible()
  await expect(page.getByText('Northwind sent message 01', { exact: true })).toHaveCount(0)
  const pages = await page.evaluate(async () => {
    const firstResponse = await fetch('/api/mail/sent?offset=0')
    const first = await firstResponse.json()
    const nextResponse = await fetch(`/api/mail/sent?offset=${first.nextOffset}`)
    return {
      workspaceId: firstResponse.headers.get('x-workspace-id'),
      identity: firstResponse.headers.get('x-workspace-identity'),
      first,
      next: await nextResponse.json(),
    }
  })
  expect(pages.workspaceId).toBe(data.currentId)
  expect(pages.identity).toBeTruthy()
  expect(pages.first.items).toHaveLength(20)
  expect(pages.next.items).toHaveLength(1)
  expect(JSON.stringify(pages)).not.toContain('Northwind sent message')
  const second = await context.newPage()
  await second.goto(`http://${data.targetHost}:3003/sent`)
  await expect(second.getByText('Northwind sent message 01', { exact: true })).toBeVisible()
  await expect(second.getByText('Foreign Northwind sent message 01', { exact: true })).toHaveCount(
    0,
  )
  await expect(second.getByText('Acme sent message 21', { exact: true })).toHaveCount(0)
  await page.reload()
  await expect(page.getByText('Acme sent message 21', { exact: true })).toBeVisible()
  await expect(page.getByText('Northwind sent message 01', { exact: true })).toHaveCount(0)
})

test('denies forged scope and identity and hides sent messages after membership revocation', async ({
  page,
}) => {
  const data = await fixture()
  await login(page, `http://${data.targetHost}:3003/login`)
  await expect(page.getByRole('heading', { name: 'Inbox', exact: true })).toBeVisible({
    timeout: 15000,
  })
  await page.goto(`http://${data.targetHost}:3003/sent`)
  await expect(page.getByText('Northwind sent message 01', { exact: true })).toBeVisible()
  const statuses = await page.evaluate(
    async ({ unrelatedId }) => ({
      foreign: (await fetch('/api/mail/sent', { headers: { 'X-Workspace-Id': unrelatedId } }))
        .status,
      forgedIdentity: (
        await fetch('/api/mail/sent', { headers: { 'X-Workspace-Identity': 'other-user' } })
      ).status,
    }),
    { unrelatedId: data.unrelatedId },
  )
  expect(statuses.foreign).toBe(403)
  expect(statuses.forgedIdentity).toBe(403)
  await control('revoke-northwind')
  const revoked = await page.evaluate(async () => (await fetch('/api/mail/sent')).status)
  expect(revoked).toBe(403)
  await page.reload()
  await expect(page.getByText('Northwind sent message 01', { exact: true })).toHaveCount(0)
})

test('refreshes the current workspace Sent list after a controlled real Core send', async ({
  page,
}) => {
  const data = await fixture()
  await login(page, `http://${data.host}:3003/login`)
  await expect(page.getByRole('heading', { name: 'Inbox', exact: true })).toBeVisible({
    timeout: 15000,
  })
  await page.goto(`http://${data.host}:3003/sent`)
  await expect(page.getByText('Acme sent message 21', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Compose', exact: true }).click()
  await page.getByRole('textbox', { name: 'Para', exact: true }).fill('recipient@example.test')
  await page.getByRole('textbox', { name: 'Assunto', exact: true }).fill('Acme newly sent message')
  await page
    .getByRole('textbox', { name: 'Corpo da mensagem', exact: true })
    .fill('Scoped sent body')
  await page.getByRole('button', { name: 'Enviar', exact: true }).click()
  await expect(page.getByText('E-mail enviado com sucesso.', { exact: true })).toBeVisible()
  await expect(page.getByText('Acme newly sent message', { exact: true })).toBeVisible()
  await page.goto(`http://${data.targetHost}:3003/sent`)
  await expect(page.getByText('Northwind sent message 01', { exact: true })).toBeVisible()
  await expect(page.getByText('Acme newly sent message', { exact: true })).toHaveCount(0)
})
