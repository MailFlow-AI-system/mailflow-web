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
  await expect(
    page
      .getByRole('region', { name: 'Sent message list', exact: true })
      .getByText('Acme sent message 21', { exact: true }),
  ).toBeVisible()
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
  await expect(
    second
      .getByRole('region', { name: 'Sent message list', exact: true })
      .getByText('Northwind sent message 01', { exact: true }),
  ).toBeVisible()
  await expect(second.getByText('Foreign Northwind sent message 01', { exact: true })).toHaveCount(
    0,
  )
  await expect(second.getByText('Acme sent message 21', { exact: true })).toHaveCount(0)
  await page.reload()
  await expect(
    page
      .getByRole('region', { name: 'Sent message list', exact: true })
      .getByText('Acme sent message 21', { exact: true }),
  ).toBeVisible()
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
  await expect(
    page
      .getByRole('region', { name: 'Sent message list', exact: true })
      .getByText('Northwind sent message 01', { exact: true }),
  ).toBeVisible()
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
  await expect(
    page
      .getByRole('region', { name: 'Sent message list', exact: true })
      .getByText('Acme sent message 21', { exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Compose', exact: true }).click()
  await page.getByRole('textbox', { name: 'Para', exact: true }).fill('recipient@example.test')
  await page.getByRole('textbox', { name: 'Assunto', exact: true }).fill('Acme newly sent message')
  await page
    .getByRole('textbox', { name: 'Corpo da mensagem', exact: true })
    .fill('Scoped sent body')
  await page.getByRole('button', { name: 'Enviar', exact: true }).click()
  await expect(page.getByText('E-mail enviado com sucesso.', { exact: true })).toBeVisible()
  await expect(
    page
      .getByRole('region', { name: 'Sent message list', exact: true })
      .getByText('Acme newly sent message', { exact: true }),
  ).toBeVisible()
  await page.goto(`http://${data.targetHost}:3003/sent`)
  await expect(
    page
      .getByRole('region', { name: 'Sent message list', exact: true })
      .getByText('Northwind sent message 01', { exact: true }),
  ).toBeVisible()
  await expect(page.getByText('Acme newly sent message', { exact: true })).toHaveCount(0)
})

test('uploads verified attachments and an inline image on localhost and sends only within the active workspace', async ({
  page,
  context,
}) => {
  const data = await fixture()
  await login(page, `http://${data.host}:3003/login`)
  await expect(page.getByRole('button', { name: 'Compose', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Compose', exact: true }).click()
  await page.getByRole('textbox', { name: 'Para', exact: true }).fill('recipient@example.test')
  await page
    .getByRole('textbox', { name: 'Assunto', exact: true })
    .fill('Localhost verified upload test')
  const body = page.getByRole('textbox', { name: 'Corpo da mensagem', exact: true })
  await body.fill('Controlled fixture delivery with attachment and inline image.')
  const fileChooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Anexar arquivo', exact: true }).click()
  await (await fileChooser).setFiles({
    name: 'localhost-notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Localhost attachment acceptance'),
  })
  const imageChooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Inserir imagem', exact: true }).click()
  await (await imageChooser).setFiles({
    name: 'localhost-inline.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aLsQAAAAASUVORK5CYII=',
      'base64',
    ),
  })
  await expect(body.locator('img')).toBeVisible()
  const send = page.getByRole('button', { name: 'Enviar', exact: true })
  await expect(send).toBeEnabled({ timeout: 15000 })
  await send.click()
  await expect(page.getByText('E-mail enviado com sucesso.', { exact: true })).toBeVisible()
  await page.goto(`http://${data.host}:3003/sent`)
  await expect(
    page
      .getByRole('region', { name: 'Sent message list', exact: true })
      .getByText('Localhost verified upload test', { exact: true }),
  ).toBeVisible()
  const sent = await page.evaluate(async () => (await fetch('/api/mail/sent')).json())
  const message = sent.items.find(
    (item: { subject: string }) => item.subject === 'Localhost verified upload test',
  )
  expect(message.attachments).toHaveLength(2)
  const foreign = await context.newPage()
  await foreign.goto(`http://${data.targetHost}:3003/inbox`)
  const status = await foreign.evaluate(
    async (id: string) => (await fetch(`/api/mail/attachments/${id}`)).status,
    message.attachments[0].id,
  )
  expect(status).toBe(404)
})
