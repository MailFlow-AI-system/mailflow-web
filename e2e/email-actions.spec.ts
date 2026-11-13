import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'
import { control, fixture, login } from './workspace-switching/fixture'

test.beforeEach(async ({ page }) => {
  await control('reset')
  await control('reset-message-actions')
  const data = await fixture()
  await login(page, `http://${data.host}:3003/login`)
  await expect(page.getByRole('heading', { name: 'Inbox', exact: true })).toBeVisible()
})

const list = (page: Page, folder = 'Inbox') =>
  page.getByRole('region', { name: `${folder} message list` })
const rows = (page: Page, folder = 'Inbox') => list(page, folder).getByRole('listitem')
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const folderLink = (page: Page, name: string) =>
  page.getByRole('link', { name: new RegExp(`^${name}( \\(\\d+ unread\\))?$`) })
const unreadCount = async (page: Page) =>
  Number((await folderLink(page, 'Inbox').textContent())?.match(/\d+/)?.[0] ?? 0)

async function openFolder(page: Page, name: string) {
  await folderLink(page, name).click()
  await expect(page.getByRole('region', { name: `${name} message list` })).toBeVisible()
}

async function messageAt(page: Page, index: number) {
  const checkbox = rows(page).nth(index).getByRole('checkbox')
  const label = (await checkbox.getAttribute('aria-label')) ?? ''
  const [, sender = '', subject = ''] = /^Select message from ([^:]+): (.*)$/.exec(label) ?? []
  return { sender, subject }
}
const subjectOf = async (page: Page, index: number) => (await messageAt(page, index)).subject

// The desktop header holds the reader toolbar; the in-reader copy is for narrow layouts.
const readerToolbar = (page: Page) => page.getByRole('toolbar', { name: 'Message actions' }).first()
const reader = (page: Page) => page.getByRole('region', { name: 'Message reader' })

async function openMessage(page: Page, folder: string, subject: string) {
  await list(page, folder)
    .getByRole('button', { name: new RegExp(`^(Unread, )?[^:]*${escapeRegExp(subject)}`) })
    .click()
  await expect(reader(page).getByRole('heading', { level: 2 })).toHaveText(subject)
}

async function expectLeft(page: Page, folder: string, subject: string) {
  await expect(rows(page, folder).filter({ hasText: subject })).toHaveCount(0)
  // The reader moves on to another message instead of showing the one that left.
  await expect(reader(page).getByRole('heading', { level: 2 })).not.toHaveText(subject)
}

async function expectListed(page: Page, folder: string, subject: string) {
  await openFolder(page, folder)
  await expect(rows(page, folder).filter({ hasText: subject })).toHaveCount(1)
}

test('archives from the reader toolbar and moves the message back to Inbox', async ({ page }) => {
  const subject = await subjectOf(page, 1)
  await openMessage(page, 'Inbox', subject)
  await readerToolbar(page).getByRole('button', { name: 'Archive', exact: true }).click()
  await expect(page.getByText('Message archived.', { exact: true })).toBeVisible()
  await expectLeft(page, 'Inbox', subject)

  await expectListed(page, 'Archive', subject)
  await openMessage(page, 'Archive', subject)
  await readerToolbar(page).getByRole('button', { name: 'Move to Inbox', exact: true }).click()
  await expect(rows(page, 'Archive').filter({ hasText: subject })).toHaveCount(0)
  await expectListed(page, 'Inbox', subject)
})

test('reports spam from the reader toolbar and marks it not spam', async ({ page }) => {
  const subject = await subjectOf(page, 2)
  await openMessage(page, 'Inbox', subject)
  await readerToolbar(page).getByRole('button', { name: 'Report spam', exact: true }).click()
  await expect(page.getByText('Message marked as spam.', { exact: true })).toBeVisible()
  await expectLeft(page, 'Inbox', subject)

  await expectListed(page, 'Spam', subject)
  await openMessage(page, 'Spam', subject)
  const toolbar = readerToolbar(page)
  await expect(toolbar.getByRole('button', { name: 'Star', exact: true })).toHaveCount(0)
  await toolbar.getByRole('button', { name: 'Not spam', exact: true }).click()
  await expect(rows(page, 'Spam').filter({ hasText: subject })).toHaveCount(0)
  await expectListed(page, 'Inbox', subject)
})

test('deletes from the reader toolbar after confirmation and restores from Trash', async ({
  page,
}) => {
  const subject = await subjectOf(page, 3)
  await openMessage(page, 'Inbox', subject)
  await readerToolbar(page).getByRole('button', { name: 'Delete', exact: true }).click()
  const confirm = page.getByRole('alertdialog', { name: 'Move message to Trash?' })
  await confirm.getByRole('button', { name: 'Cancel' }).click()
  await expect(reader(page).getByRole('heading', { level: 2 })).toHaveText(subject)

  await readerToolbar(page).getByRole('button', { name: 'Delete', exact: true }).click()
  await confirm.getByRole('button', { name: 'Move to Trash' }).click()
  await expect(page.getByText('Message moved to Trash.', { exact: true })).toBeVisible()
  await expectLeft(page, 'Inbox', subject)

  await expectListed(page, 'Trash', subject)
  await openMessage(page, 'Trash', subject)
  const toolbar = readerToolbar(page)
  await toolbar.getByRole('button', { name: 'Delete permanently', exact: true }).click()
  const permanent = page.getByRole('alertdialog', { name: 'Delete message permanently?' })
  await expect(permanent).toContainText('everyone in this workspace')
  await permanent.getByRole('button', { name: 'Cancel' }).click()
  await expect(permanent).toHaveCount(0)
  await toolbar.getByRole('button', { name: 'Restore', exact: true }).click()
  await expect(page.getByText('Message restored.', { exact: true })).toBeVisible()
  await expect(rows(page, 'Trash').filter({ hasText: subject })).toHaveCount(0)
  await expectListed(page, 'Inbox', subject)
})

test('archives from the row before Core answers, offers Undo and lists the message in Archive', async ({
  page,
}) => {
  const subject = await subjectOf(page, 1)
  const row = rows(page).filter({ hasText: subject })
  await row.hover()
  await row.getByRole('button', { name: `Archive message: ${subject}` }).click()

  await expect(row).toHaveCount(0)
  const toast = page.getByText('Message archived.', { exact: true })
  await expect(toast).toBeVisible()
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(rows(page).filter({ hasText: subject })).toHaveCount(1)

  await rows(page).filter({ hasText: subject }).hover()
  await rows(page)
    .filter({ hasText: subject })
    .getByRole('button', { name: `Archive message: ${subject}` })
    .click()
  await openFolder(page, 'Archive')
  await expect(rows(page, 'Archive').filter({ hasText: subject })).toHaveCount(1)
})

test('confirms moving selected messages to Trash and protects permanent deletion', async ({
  page,
}) => {
  const first = await subjectOf(page, 1)
  const second = await subjectOf(page, 2)
  for (const subject of [first, second])
    await list(page)
      .getByRole('checkbox', { name: new RegExp(`: ${escapeRegExp(subject)}$`) })
      .check()
  await page.getByRole('button', { name: 'Delete: selected messages' }).click()

  const dialog = page.getByRole('alertdialog', { name: 'Move 2 messages to Trash?' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused()
  expect(
    (await new AxeBuilder({ page }).include('[role="alertdialog"]').analyze()).violations,
  ).toEqual([])
  await dialog.getByRole('button', { name: 'Move to Trash' }).click()

  await expect(page.getByText('2 messages moved to Trash.', { exact: true })).toBeVisible()
  for (const subject of [first, second])
    await expect(rows(page).filter({ hasText: subject })).toHaveCount(0)

  await openFolder(page, 'Trash')
  const trashed = rows(page, 'Trash').filter({ hasText: first })
  await expect(trashed).toHaveCount(1)
  await trashed.hover()
  await trashed.getByRole('button', { name: `Delete permanently: ${first}` }).click()
  const permanent = page.getByRole('alertdialog', { name: 'Delete message permanently?' })
  await expect(permanent).toContainText('This cannot be undone.')
  await permanent.getByRole('button', { name: 'Cancel' }).click()
  await expect(permanent).toHaveCount(0)

  await trashed.hover()
  await trashed.getByRole('button', { name: `Restore message: ${first}` }).click()
  await expect(trashed).toHaveCount(0)
  await openFolder(page, 'Inbox')
  await expect(rows(page).filter({ hasText: first })).toHaveCount(1)
})

test('marks read on open, toggles read and star from the reader and updates the badge', async ({
  page,
}) => {
  await expect(folderLink(page, 'Inbox')).toHaveAccessibleName(/^Inbox \(\d+ unread\)$/)
  const before = await unreadCount(page)
  const { sender, subject } = await messageAt(page, 2)
  const message = list(page).getByRole('button', {
    name: new RegExp(`^(Unread, )?${escapeRegExp(sender)} ${escapeRegExp(subject)}`),
  })
  await expect(message).toHaveAccessibleName(/^Unread,/)

  await message.click()
  await expect(message).not.toHaveAccessibleName(/^Unread,/)
  await expect.poll(() => unreadCount(page)).toBe(before - 1)

  const toolbar = page.getByRole('toolbar', { name: 'Message actions' }).first()
  await toolbar.getByRole('button', { name: 'Mark as unread' }).click()
  await expect(message).toHaveAccessibleName(/^Unread,/)

  const star = toolbar.getByRole('button', { name: 'Star', exact: true })
  await star.click()
  await expect(star).toHaveAttribute('aria-pressed', 'true')
  await openFolder(page, 'Starred')
  await expect(rows(page, 'Starred').filter({ hasText: subject })).toHaveCount(1)
})

test('has no accessibility violations in a folder list with quick actions', async ({ page }) => {
  await rows(page).first().hover()
  const results = await new AxeBuilder({ page }).include('main').analyze()
  expect(results.violations).toEqual([])
})
