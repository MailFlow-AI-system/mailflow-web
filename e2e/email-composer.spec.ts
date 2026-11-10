import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { control, fixture, login } from './workspace-switching/fixture'

test.beforeEach(async ({ page }) => {
  await control('reset')
  const data = await fixture()
  await login(page, `http://${data.host}:3003/login`)
  await expect(page.getByRole('heading', { name: 'Inbox', exact: true })).toBeVisible({
    timeout: 15000,
  })
  await page.getByRole('button', { name: 'Compose', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'To', exact: true })).toBeFocused()
})

test('formats selected text, toggles lists and handles editor shortcuts/undo', async ({ page }) => {
  const body = page.getByRole('textbox', { name: 'Message body' })
  await body.fill('Message content')
  await body.press('Control+a')
  for (const name of ['Bold', 'Italic', 'Underline']) {
    await page.getByRole('button', { name, exact: true }).click()
  }
  await expect(body.locator('strong em u')).toHaveText('Message content')
  await expect(page.getByRole('button', { name: 'Underline', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.getByRole('button', { name: 'Bulleted list', exact: true }).click()
  await expect(body.locator('ul li')).toHaveText('Message content')
  await page.getByRole('button', { name: 'Numbered list', exact: true }).click()
  await expect(body.locator('ol li')).toHaveText('Message content')
  await page.getByRole('button', { name: 'Numbered list', exact: true }).click()
  await expect(body.locator('ol')).toHaveCount(0)
  await body.press('Control+a')
  await body.press('Control+b')
  await expect(body.locator('strong')).toHaveCount(0)
  await body.press('Control+z')
  await expect(body.locator('strong')).toHaveText('Message content')
})

test('inserts, edits and removes links; inserts emoji, local image and removable attachments', async ({
  page,
}) => {
  const body = page.getByRole('textbox', { name: 'Message body' })
  await body.fill('Selected text')
  await body.press('Control+a')
  await page.getByRole('button', { name: 'Insert link', exact: true }).click()
  await page.getByRole('textbox', { name: 'Link', exact: true }).fill('javascript:alert(1)')
  await page.getByRole('button', { name: 'Apply', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('HTTP')
  await page.getByRole('textbox', { name: 'Link', exact: true }).fill('example.com')
  await page.getByRole('button', { name: 'Apply', exact: true }).click()
  await expect(body.locator('a')).toHaveAttribute('href', 'https://example.com/')
  await page.getByRole('button', { name: 'Insert link', exact: true }).click()
  await page.getByRole('textbox', { name: 'Link', exact: true }).fill('https://example.org')
  await page.getByRole('button', { name: 'Apply', exact: true }).click()
  await expect(body.locator('a')).toHaveAttribute('href', 'https://example.org/')
  await page.getByRole('button', { name: 'Insert link', exact: true }).click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('form', { name: 'Edit link' })).toHaveCount(0)
  await expect(page.getByRole('alertdialog')).toHaveCount(0)
  await expect(body).toBeFocused()
  await page.getByRole('button', { name: 'Insert link', exact: true }).click()
  await page.getByRole('button', { name: 'Remove link', exact: true }).click()
  await expect(body.locator('a')).toHaveCount(0)
  await body.press('End')
  await page.getByRole('button', { name: 'Insert emoji', exact: true }).click()
  await expect(page.getByRole('button', { name: 'grinning', exact: true })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('group', { name: 'Choose emoji' })).toHaveCount(0)
  await expect(page.getByRole('alertdialog')).toHaveCount(0)
  await page.getByRole('button', { name: 'Insert emoji', exact: true }).click()
  await page.getByRole('button', { name: 'tada', exact: true }).click()
  await expect(body).toContainText('🎉')
  const imageChooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Insert image', exact: true }).click()
  await (await imageChooser).setFiles({
    name: 'example.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aLsQAAAAASUVORK5CYII=',
      'base64',
    ),
  })
  await expect(body.locator('img')).toHaveAttribute('src', /^data:image\/png;base64,/)
  const fileChooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Attach file', exact: true }).click()
  await (await fileChooser).setFiles({
    name: 'notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Test attachment'),
  })
  await expect(page.getByRole('list', { name: 'Attached files' })).toContainText('notes.txt')
  await page.getByRole('button', { name: 'Remove notes.txt' }).click()
  await expect(page.getByRole('list', { name: 'Attached files' })).toHaveCount(0)
})

test('preserves fields, rich content and attachments across size states and resets on explicit discard', async ({
  page,
}) => {
  const body = page.getByRole('textbox', { name: 'Message body' })
  await page.getByRole('textbox', { name: 'Subject', exact: true }).fill('Retained subject')
  await page.getByRole('button', { name: 'Cc/Bcc', exact: true }).click()
  await page.getByRole('textbox', { name: 'Bcc', exact: true }).fill('hidden@example.com')
  await body.fill('Retained content')
  await body.press('Control+a')
  await page.getByRole('button', { name: 'Bold', exact: true }).click()
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Attach file', exact: true }).click()
  await (await chooser).setFiles({
    name: 'retained.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Retained attachment'),
  })
  await page.getByRole('button', { name: 'Maximize window' }).click()
  await page.getByRole('button', { name: 'Minimize window' }).click()
  await expect(page.getByRole('dialog', { name: 'New message' })).toBeHidden()
  await expect(page.getByRole('button', { name: 'Restore message' })).toBeFocused()
  await page.getByRole('button', { name: 'Restore message' }).click()
  await expect(page.getByRole('button', { name: 'Restore size' })).toBeVisible()
  await page.getByRole('button', { name: 'Restore size' }).click()
  await expect(body.locator('strong')).toHaveText('Retained content')
  await expect(page.getByRole('list', { name: 'Attached files' })).toContainText('retained.txt')
  await expect(page.getByRole('textbox', { name: 'Bcc', exact: true })).toHaveValue(
    'hidden@example.com',
  )
  await page.getByRole('button', { name: 'Discard draft', exact: true }).click()
  await expect(page.getByRole('alertdialog', { name: 'Discard draft?' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Keep editing' })).toBeFocused()
  await page.getByRole('button', { name: 'Discard message' }).click()
  await expect(page.getByRole('button', { name: 'Compose', exact: true })).toBeFocused()
  await page.getByRole('button', { name: 'Compose', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'To', exact: true })).toBeFocused()
  await expect(body).toHaveText('')
  await body.press('Control+z')
  await expect(body).toHaveText('')
  await expect(page.getByRole('list', { name: 'Attached files' })).toHaveCount(0)
  await expect(page.getByRole('textbox', { name: 'Subject', exact: true })).toHaveValue('')
})

test('uses keyboard focus boundaries and saves a recoverable draft when Escape closes the composer', async ({
  page,
}) => {
  const toolbar = page.getByRole('toolbar', { name: 'Message formatting' })
  const bold = toolbar.getByRole('button', { name: 'Bold', exact: true })
  await bold.focus()
  await bold.press('ArrowRight')
  await expect(toolbar.getByRole('button', { name: 'Italic', exact: true })).toBeFocused()
  await page.keyboard.press('End')
  await expect(toolbar.getByRole('button', { name: 'Attach file', exact: true })).toBeFocused()
  await page.keyboard.press('Home')
  await expect(bold).toBeFocused()
  await page.getByRole('button', { name: 'Generate CTA', exact: true }).focus()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Minimize window' })).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(page.getByRole('button', { name: 'Generate CTA', exact: true })).toBeFocused()
  await page.getByRole('textbox', { name: 'Subject', exact: true }).fill('Saved draft')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'New message' })).toBeHidden()
  await expect(page.getByRole('alertdialog')).toHaveCount(0)
  await page.getByRole('link', { name: 'Drafts', exact: true }).click()
  await page
    .getByRole('region', { name: 'Draft message list' })
    .getByRole('button', { name: /Saved draft/ })
    .click()
  await page.getByRole('button', { name: 'Save draft', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'New message' }).getByRole('status')).toHaveText(
    'Draft saved',
  )
  await page.getByRole('button', { name: 'Close window' }).click()
  await expect(page.getByRole('alertdialog')).toHaveCount(0)
  await page.getByRole('button', { name: 'Compose', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Subject', exact: true })).toHaveValue('')
})

test('fits a small viewport and scrolls to editing actions without horizontal overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 480 })
  const dialog = page.getByRole('dialog', { name: 'New message' })
  await expect(page.getByRole('complementary', { name: 'AI Assistant' })).toBeHidden()
  const dimensions = await dialog.evaluate((element) => ({
    width: element.getBoundingClientRect().width,
    scroll: element.scrollWidth,
    client: element.clientWidth,
  }))
  expect(dimensions.width).toBeLessThanOrEqual(320)
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client)
  await page.getByRole('button', { name: 'Save draft', exact: true }).focus()
  await expect(page.getByRole('button', { name: 'Save draft', exact: true })).toBeInViewport()
  await page.setViewportSize({ width: 1280, height: 720 })
  await expect(page.getByRole('complementary', { name: 'AI Assistant' })).toBeVisible()
})

test('exposes an accessible modal and confirmation with no Axe violations', async ({ page }) => {
  const normal = await new AxeBuilder({ page }).include('[data-slot="window-content"]').analyze()
  expect(normal.violations).toEqual([])
  await page.getByRole('textbox', { name: 'Subject', exact: true }).fill('Unsaved')
  await page.getByRole('button', { name: 'Discard draft', exact: true }).click()
  const confirmation = await new AxeBuilder({ page }).include('[role="alertdialog"]').analyze()
  expect(confirmation.violations).toEqual([])
  await expect(page.getByRole('button', { name: 'Keep editing' })).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(page.getByRole('button', { name: 'Discard message' })).toBeFocused()
})
