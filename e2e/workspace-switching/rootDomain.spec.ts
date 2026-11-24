import { expect, test } from '@playwright/test'
import { control, fixture, login, logout } from './fixture'

test.beforeEach(async () => {
  await control('reset')
})

test('redirects hosts without a workspace to the landing page', async ({ page }) => {
  // The landing is not part of this harness, so its navigation fails after the redirect.
  const arrivals: { url: string; from?: string }[] = []
  page.on('request', (request) => {
    if (request.url().startsWith('http://localhost:4321/'))
      arrivals.push({ url: request.url(), from: request.redirectedFrom()?.url() })
  })
  const hosts = ['localhost', 'app.localhost', 'www.localhost', 'app-dev.localhost']
  for (const host of hosts)
    await page.goto(`http://${host}:3003/login`, { timeout: 5000 }).catch(() => undefined)
  expect(arrivals).toEqual(
    hosts.map((host) => ({ url: 'http://localhost:4321/', from: `http://${host}:3003/login` })),
  )
})

test('signs in on the workspace host, switches with a one-time handoff and signs out per host', async ({
  browser,
  page,
  context,
}) => {
  const data = await fixture()
  await login(page, `http://${data.host}:3003/login`)
  await expect(page).toHaveURL(new RegExp(`^http://${data.host}:3003/inbox(?:\\?|#|$)`))
  await expect(page.getByRole('combobox', { name: 'Workspace: Acme Corp' })).toBeVisible()

  const sessionCookies = (await context.cookies()).filter((cookie) =>
    cookie.name.includes('better-auth.session_token'),
  )
  expect(sessionCookies.map((cookie) => cookie.domain)).toEqual([data.host])
  expect(sessionCookies[0]).toMatchObject({ httpOnly: true, sameSite: 'Lax' })

  const handoffs: string[] = []
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/auth/handoff') handoffs.push(request.url())
  })
  await page.getByRole('combobox', { name: 'Workspace: Acme Corp' }).click()
  await page.getByRole('option', { name: 'Northwind' }).click()
  await expect(page).toHaveURL(new RegExp(`^http://${data.targetHost}:3003/inbox(?:\\?|#|$)`))
  await expect(page.getByRole('combobox', { name: 'Workspace: Northwind' })).toBeVisible()
  await expect(page.getByText('Northwind private message', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Acme private message', { exact: true })).toHaveCount(0)
  expect(handoffs).toHaveLength(1)
  expect(new URL(handoffs[0] ?? '').host).toBe(`${data.targetHost}:3003`)

  // Each host holds its own session; nothing is shared through a parent-domain cookie.
  const hosts = (await context.cookies())
    .filter((cookie) => cookie.name.includes('better-auth.session_token'))
    .map((cookie) => cookie.domain)
    .sort()
  expect(hosts).toEqual([data.host, data.targetHost].sort())

  // The code is single-use: replaying the same link falls back to the login page.
  const fresh = await browser.newContext()
  const replay = await fresh.newPage()
  await replay.goto(handoffs[0] ?? '')
  await expect(replay).toHaveURL(`http://${data.targetHost}:3003/login?handoff=expired`)
  await expect(replay.getByText('That workspace link is invalid or has expired.')).toBeVisible()
  expect(
    (await fresh.cookies()).filter((cookie) => cookie.name.includes('better-auth.session_token')),
  ).toEqual([])
  await fresh.close()

  await logout(page)
  await expect(page).toHaveURL(new RegExp(`^http://${data.targetHost}:3003/login`))
  await page.goto(`http://${data.host}:3003/inbox`)
  await expect(page.getByRole('combobox', { name: 'Workspace: Acme Corp' })).toBeVisible()
})

test('rejects a forged or expired handoff code', async ({ page }) => {
  const data = await fixture()
  await page.goto(`http://${data.targetHost}:3003/auth/handoff?code=${'A'.repeat(43)}`)
  await expect(page).toHaveURL(`http://${data.targetHost}:3003/login?handoff=expired`)
  await expect(page.getByRole('heading', { name: 'Sign in to MailFlow' })).toBeVisible()
})

test('signs out a user who is not a member of the host workspace', async ({ page, context }) => {
  const data = await fixture()
  await login(page, `http://${data.unrelatedHost}:3003/login`)
  await expect(page.getByRole('alert')).toHaveText(
    'This account does not have access to this workspace.',
  )
  await expect(page).toHaveURL(`http://${data.unrelatedHost}:3003/login`)
  const sessions = (await context.cookies(`http://${data.unrelatedHost}:3003`)).filter(
    (cookie) => cookie.name.includes('better-auth.session_token') && cookie.value,
  )
  expect(sessions).toEqual([])
})
