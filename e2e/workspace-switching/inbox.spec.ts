import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { control, fixture, login } from './fixture'

test.setTimeout(60000)

test.beforeEach(async () => {
  await control('reset')
})

test('isolates real inboxes across tabs, search, pagination and refresh', async ({
  page,
  context,
}, testInfo) => {
  const data = await fixture()
  await login(page, `http://${data.host}:3003/login`)
  await expect(page.getByText('Acme private message', { exact: true })).toBeVisible({
    timeout: 15000,
  })
  await expect(page.getByText('Northwind private message', { exact: true })).toHaveCount(0)
  const second = await context.newPage()
  await second.goto(`http://${data.targetHost}:3003/inbox`)
  await expect(second.getByText('Northwind private message', { exact: true })).toBeVisible()
  await expect(second.getByText('Acme private message', { exact: true })).toHaveCount(0)
  await page.reload()
  await expect(page.getByText('Acme private message', { exact: true })).toBeVisible({
    timeout: 15000,
  })
  const pages = await page.evaluate(async () => {
    const firstResponse = await fetch('/api/mail/messages')
    const first = await firstResponse.json()
    const nextResponse = await fetch(`/api/mail/messages?cursor=${first.nextCursor}`)
    return { first, next: await nextResponse.json() }
  })
  expect(pages.first.items).toHaveLength(8)
  expect(pages.next.items).toHaveLength(8)
  expect(new Set([...pages.first.items, ...pages.next.items].map((item) => item.id)).size).toBe(16)
  expect(JSON.stringify(pages)).not.toContain('Northwind private message')
  await page.getByRole('searchbox', { name: 'Buscar em inbox…', exact: true }).fill('Acme private')
  await expect(page.getByText('Acme private message', { exact: true })).toBeVisible({
    timeout: 15000,
  })
  await expect(page).toHaveURL(/q=Acme/)
  await page
    .getByRole('searchbox', { name: 'Buscar em inbox…', exact: true })
    .fill('Northwind private')
  await expect(page.getByText('No messages found.', { exact: true })).toBeVisible()
  await page.getByRole('searchbox', { name: 'Buscar em inbox…', exact: true }).fill('')
  await expect(page.getByText('Acme private message', { exact: true })).toBeVisible({
    timeout: 15000,
  })
  expect(
    (await new AxeBuilder({ page }).include('[aria-label="Inbox"]').analyze()).violations,
  ).toEqual([])
  await page.screenshot({
    path: testInfo.outputPath('workspace-inbox-desktop.png'),
    animations: 'disabled',
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByText('Acme private message', { exact: true })).toBeVisible({
    timeout: 15000,
  })
  await page.screenshot({
    path: testInfo.outputPath('workspace-inbox-mobile.png'),
    animations: 'disabled',
  })
})

test('denies spoofed identity, unrelated hosts, revoked membership and legacy inbox', async ({
  page,
}) => {
  const data = await fixture()
  await login(page, `http://${data.host}:3003/login`)
  await expect(page.getByText('Acme private message', { exact: true })).toBeVisible({
    timeout: 15000,
  })
  const mismatch = await page.evaluate(
    async () =>
      (await fetch('/api/mail/messages', { headers: { 'X-Workspace-Identity': 'other-user' } }))
        .status,
  )
  expect(mismatch).toBe(403)
  await page.goto(`http://${data.unrelatedHost}:3003/inbox`)
  await expect(page.getByRole('heading', { name: 'Workspace unavailable' })).toBeVisible()
  expect(await page.evaluate(async () => (await fetch('/api/mail/messages')).status)).toBe(404)
  await page.goto(`http://${data.targetHost}:3003/inbox`)
  await expect(page.getByText('Northwind private message', { exact: true })).toBeVisible()
  await control('revoke-northwind')
  expect(await page.evaluate(async () => (await fetch('/api/mail/messages')).status)).toBe(404)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Workspace unavailable' })).toBeVisible()
  await expect(page.getByText('Northwind private message', { exact: true })).toHaveCount(0)
  expect((await fetch('http://127.0.0.1:8083/api/v1/mail/messages')).status).toBe(401)
})
