import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'
import { control, fixture, login, logout } from './workspace-switching/fixture'

test.beforeEach(async ({ page }) => {
  await control('reset')
  await control('reset-drafts')
  const data = await fixture()
  await login(page, `http://${data.host}:3003/login`)
  await expect(page.getByRole('heading', { name: 'Inbox', exact: true })).toBeVisible()
})

const composer = (page: Page) => page.getByRole('dialog', { name: 'New message' })
const subjectField = (page: Page) =>
  composer(page).getByRole('textbox', { name: 'Subject', exact: true })
const toField = (page: Page) => composer(page).getByRole('textbox', { name: 'To', exact: true })
const draftList = (page: Page) => page.getByRole('region', { name: 'Draft message list' })
const emptyList = (page: Page) => draftList(page).getByText('No messages found.', { exact: true })
const draftRow = (page: Page, subject: string) =>
  draftList(page).getByRole('button', { name: new RegExp(subject) })

async function compose(page: Page, subject: string, to = '') {
  await page.getByRole('button', { name: 'Compose', exact: true }).click()
  await subjectField(page).fill(subject)
  if (to) await toField(page).fill(to)
}
async function saved(page: Page) {
  await expect(composer(page).getByRole('status')).toHaveText('Draft saved')
}
async function closeWindow(page: Page) {
  await page.getByRole('button', { name: 'Close window' }).click()
}
async function createDraft(page: Page, subject: string, to = '') {
  await compose(page, subject, to)
  await saved(page)
  await closeWindow(page)
}
async function drafts(page: Page) {
  await page.getByRole('link', { name: 'Drafts', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Drafts', exact: true })).toBeVisible()
}

test('autosaves incomplete fields, recovers after reload and updates the same draft', async ({
  page,
}) => {
  await compose(page, 'Automatic draft', 'unfinished@')
  await saved(page)
  await closeWindow(page)
  await drafts(page)
  await page.reload()
  await draftRow(page, 'Automatic draft').click()
  await expect(toField(page)).toHaveValue('unfinished@')
  await subjectField(page).fill('Updated draft')
  await saved(page)
  await closeWindow(page)
  await expect(draftRow(page, 'Updated draft')).toBeVisible()
  await expect(draftRow(page, 'Automatic draft')).toHaveCount(0)
  await expect(draftList(page).getByRole('listitem')).toHaveCount(1)
})

test('manual save confirms persistence and closing an empty composer creates nothing', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Compose', exact: true }).click()
  await closeWindow(page)
  await drafts(page)
  await expect(emptyList(page)).toBeVisible()
  await compose(page, 'Manual draft')
  await page.getByRole('button', { name: 'Save draft', exact: true }).click()
  await expect(page.getByText('Draft saved.', { exact: true })).toBeVisible()
  await saved(page)
  await closeWindow(page)
  await page.reload()
  await expect(draftRow(page, 'Manual draft')).toBeVisible()
})

test('recovers rich content, inline images and attachments after a new login, then sends once', async ({
  page,
}) => {
  await compose(page, 'Draft with files', 'ada@example.test')
  const body = page.getByRole('textbox', { name: 'Message body' })
  await body.fill('Recover this content')
  await body.press('Control+a')
  await page.getByRole('button', { name: 'Bold', exact: true }).click()
  const imageChooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Insert image', exact: true }).click()
  await (await imageChooser).setFiles({
    name: 'pixel.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aLsQAAAAASUVORK5CYII=',
      'base64',
    ),
  })
  const fileChooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Attach file', exact: true }).click()
  await (await fileChooser).setFiles({
    name: 'notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Persistent notes'),
  })
  await saved(page)
  await closeWindow(page)
  await logout(page)
  const data = await fixture()
  await login(page, `http://${data.host}:3003/login`)
  await drafts(page)
  await draftRow(page, 'Draft with files').click()
  await expect(body.locator('strong')).toHaveText('Recover this content')
  await expect(body.locator('img')).toHaveAttribute('src', /^data:image\/png;base64,/)
  await expect(page.getByRole('list', { name: 'Attached files' })).toContainText('notes.txt')
  await page.getByRole('button', { name: 'Send', exact: true }).click()
  await expect(page.getByText('Email sent successfully.', { exact: true })).toBeVisible()
  await expect(composer(page)).toBeHidden()
  await expect(draftRow(page, 'Draft with files')).toHaveCount(0)
  await page.reload()
  await expect(draftRow(page, 'Draft with files')).toHaveCount(0)
})

test('keeps content and the composer open when saving fails, then retries manually', async ({
  page,
}) => {
  let failures = 0
  await page.route('**/api/mail/drafts/*', (route) => {
    if (route.request().method() === 'PUT') {
      failures += 1
      return route.abort()
    }
    return route.continue()
  })
  await compose(page, 'Keep after failure')
  await expect(page.getByRole('alert').filter({ hasText: 'was kept' })).toBeVisible()
  await closeWindow(page)
  await expect.poll(() => failures).toBeGreaterThanOrEqual(2)
  await expect(composer(page).getByRole('status')).toHaveText('Failed to save the draft')
  await expect(subjectField(page)).toHaveValue('Keep after failure')
  await page.unroute('**/api/mail/drafts/*')
  await page.getByRole('button', { name: 'Try saving again', exact: true }).click()
  await saved(page)
  await closeWindow(page)
  await drafts(page)
  await expect(draftRow(page, 'Keep after failure')).toBeVisible()
})

test('waits for autosave before discarding and never recreates the deleted draft', async ({
  page,
}) => {
  let release!: () => void
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  let started!: () => void
  const requestStarted = new Promise<void>((resolve) => {
    started = resolve
  })
  await page.route('**/api/mail/drafts/*', async (route) => {
    if (route.request().method() === 'PUT') {
      started()
      await held
    }
    await route.continue()
  })
  await compose(page, 'Discard pending save')
  await requestStarted
  await page.getByRole('button', { name: 'Discard draft', exact: true }).click()
  await page.getByRole('button', { name: 'Discard message', exact: true }).click()
  release()
  await expect(composer(page)).toBeHidden()
  await drafts(page)
  await page.reload()
  await expect(emptyList(page)).toBeVisible()
})

test('preserves edits from two tabs and offers an explicit new copy on conflict', async ({
  page,
  context,
}) => {
  await createDraft(page, 'Shared draft')
  await drafts(page)
  const sibling = await context.newPage()
  try {
    await sibling.goto(page.url())
    await draftRow(sibling, 'Shared draft').click()
    await draftRow(page, 'Shared draft').click()
    await subjectField(sibling).fill('Other tab version')
    await saved(sibling)
    await subjectField(page).fill('My version')
    await page.getByRole('button', { name: 'Save as new draft', exact: true }).click()
    await saved(page)
    await closeWindow(page)
    await page.reload()
    await expect(draftRow(page, 'Other tab version')).toBeVisible()
    await expect(draftRow(page, 'My version')).toBeVisible()
  } finally {
    await sibling.close()
  }
})

test('searches drafts by subject and recipient, and clears the search', async ({ page }) => {
  await createDraft(page, 'Budget review', 'finance@example.test')
  await createDraft(page, 'Team offsite', 'people@example.test')
  await createDraft(page, 'Quarterly plan', 'ada@example.test')
  await drafts(page)
  await expect(draftList(page).getByRole('listitem')).toHaveCount(3)
  const search = page.getByRole('searchbox', { name: /^Search in drafts/i })
  await search.fill('budget')
  await expect(draftList(page).getByRole('listitem')).toHaveCount(1)
  await expect(draftRow(page, 'Budget review')).toBeVisible()
  await search.fill('PEOPLE@')
  await expect(draftRow(page, 'Team offsite')).toBeVisible()
  await expect(draftList(page).getByRole('listitem')).toHaveCount(1)
  await search.fill('nothing matches this')
  await expect(emptyList(page)).toBeVisible()
  await page.getByRole('button', { name: 'Clear search' }).click()
  await expect(draftList(page).getByRole('listitem')).toHaveCount(3)
})

test('selects drafts and deletes them in bulk after confirmation', async ({ page }, info) => {
  await createDraft(page, 'Keep this one')
  await createDraft(page, 'Delete me first')
  await createDraft(page, 'Delete me second')
  await drafts(page)
  await draftList(page)
    .getByRole('checkbox', { name: /Delete me first/ })
    .check()
  await draftList(page)
    .getByRole('checkbox', { name: /Delete me second/ })
    .check()
  await expect(page.getByText('2 selected')).toBeVisible()
  await page.getByRole('button', { name: 'Delete selected drafts' }).click()
  await expect(page.getByText('Delete 2 drafts?')).toBeVisible()
  expect(
    (await new AxeBuilder({ page }).include('[role="alertdialog"]').analyze()).violations,
  ).toEqual([])
  await page.screenshot({ path: info.outputPath('drafts-bulk-dialog.png'), fullPage: true })
  await page.getByRole('button', { name: 'Delete drafts', exact: true }).click()
  await expect(page.getByText('2 drafts deleted.', { exact: true })).toBeVisible()
  await expect(draftList(page).getByRole('listitem')).toHaveCount(1)
  await expect(draftRow(page, 'Keep this one')).toBeVisible()
  await page.reload()
  await expect(draftList(page).getByRole('listitem')).toHaveCount(1)
})

test('searches Sent and offers selection without destructive actions', async ({ page }) => {
  await page.getByRole('link', { name: 'Sent', exact: true }).click()
  const sentList = page.getByRole('region', { name: 'Sent message list' })
  await expect(sentList.getByRole('listitem').first()).toBeVisible()
  const search = page.getByRole('searchbox', { name: /^Search in sent/i })
  await search.fill('sent message 07')
  await expect(sentList.getByRole('listitem')).toHaveCount(1)
  await expect(sentList.getByText('Acme sent message 07')).toBeVisible()
  await sentList.getByRole('checkbox', { name: /Acme sent message 07/ }).check()
  await expect(page.getByText('1 selected')).toBeVisible()
  await expect(page.getByRole('button', { name: /Delete/ })).toHaveCount(0)
  await page.getByRole('button', { name: 'Clear selection' }).click()
  await search.fill('no such sent message')
  await expect(sentList.getByText('No messages found.', { exact: true })).toBeVisible()
})

test('lists drafts across the whole page and continues them in the Composer', async ({
  page,
}, info) => {
  await createDraft(page, 'Review this draft', 'ada@example.test')
  await drafts(page)
  await expect(draftRow(page, 'Review this draft')).toBeVisible()
  const viewport = page.viewportSize()
  const panel = await page.getByRole('region', { name: 'Drafts', exact: true }).boundingBox()
  expect(panel?.width ?? 0).toBeGreaterThan((viewport?.width ?? 0) * 0.6)
  const search = await page.getByRole('searchbox', { name: /^Search in drafts/i }).boundingBox()
  expect(search?.width ?? 0).toBeGreaterThan((viewport?.width ?? 0) * 0.4)
  await page.screenshot({ path: info.outputPath('drafts-desktop.png'), fullPage: true })
  expect(
    (await new AxeBuilder({ page }).include('section[aria-label="Drafts"]').analyze()).violations,
  ).toEqual([])
  await draftRow(page, 'Review this draft').click()
  await expect(subjectField(page)).toHaveValue('Review this draft')
  await page.screenshot({ path: info.outputPath('composer-desktop.png'), fullPage: true })
  await closeWindow(page)
  await page.setViewportSize({ width: 375, height: 812 })
  await expect(draftRow(page, 'Review this draft')).toBeVisible()
  await page.screenshot({ path: info.outputPath('drafts-mobile.png'), fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await draftRow(page, 'Review this draft').click()
  await expect(subjectField(page)).toBeVisible()
  await page.screenshot({ path: info.outputPath('composer-mobile.png'), fullPage: true })
})
