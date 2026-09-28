import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test.beforeEach(async ({ context, page }) => {
  await context.addCookies([
    {
      name: 'better-auth.session_token',
      value: 'e2e',
      url: `http://127.0.0.1:${process.env.E2E_PORT ?? '3000'}`,
    },
  ])
  await page.goto('/inbox')
  await page.getByRole('button', { name: 'Compose', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Para', exact: true })).toBeFocused()
})

test('formats selected text, toggles lists and handles editor shortcuts/undo', async ({ page }) => {
  const body = page.getByRole('textbox', { name: 'Corpo da mensagem' })
  await body.fill('Message content')
  await body.press('Control+a')
  for (const name of ['Negrito', 'Itálico', 'Sublinhado']) {
    await page.getByRole('button', { name, exact: true }).click()
  }
  await expect(body.locator('strong em u')).toHaveText('Message content')
  await expect(page.getByRole('button', { name: 'Sublinhado', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.getByRole('button', { name: 'Lista com marcadores', exact: true }).click()
  await expect(body.locator('ul li')).toHaveText('Message content')
  await page.getByRole('button', { name: 'Lista numerada', exact: true }).click()
  await expect(body.locator('ol li')).toHaveText('Message content')
  await page.getByRole('button', { name: 'Lista numerada', exact: true }).click()
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
  const body = page.getByRole('textbox', { name: 'Corpo da mensagem' })
  await body.fill('Selected text')
  await body.press('Control+a')
  await page.getByRole('button', { name: 'Inserir link', exact: true }).click()
  await page.getByRole('textbox', { name: 'Link', exact: true }).fill('javascript:alert(1)')
  await page.getByRole('button', { name: 'Aplicar', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('HTTP')
  await page.getByRole('textbox', { name: 'Link', exact: true }).fill('example.com')
  await page.getByRole('button', { name: 'Aplicar', exact: true }).click()
  await expect(body.locator('a')).toHaveAttribute('href', 'https://example.com/')
  await page.getByRole('button', { name: 'Inserir link', exact: true }).click()
  await page.getByRole('textbox', { name: 'Link', exact: true }).fill('https://example.org')
  await page.getByRole('button', { name: 'Aplicar', exact: true }).click()
  await expect(body.locator('a')).toHaveAttribute('href', 'https://example.org/')
  await page.getByRole('button', { name: 'Inserir link', exact: true }).click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('form', { name: 'Editar link' })).toHaveCount(0)
  await expect(page.getByRole('alertdialog')).toHaveCount(0)
  await expect(body).toBeFocused()
  await page.getByRole('button', { name: 'Inserir link', exact: true }).click()
  await page.getByRole('button', { name: 'Remover link', exact: true }).click()
  await expect(body.locator('a')).toHaveCount(0)
  await body.press('End')
  await page.getByRole('button', { name: 'Inserir emoji', exact: true }).click()
  await expect(page.getByRole('button', { name: 'grinning', exact: true })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('group', { name: 'Escolher emoji' })).toHaveCount(0)
  await expect(page.getByRole('alertdialog')).toHaveCount(0)
  await page.getByRole('button', { name: 'Inserir emoji', exact: true }).click()
  await page.getByRole('button', { name: 'tada', exact: true }).click()
  await expect(body).toContainText('🎉')
  const imageChooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Inserir imagem', exact: true }).click()
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
  await page.getByRole('button', { name: 'Anexar arquivo', exact: true }).click()
  await (await fileChooser).setFiles({
    name: 'notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Test attachment'),
  })
  await expect(page.getByRole('list', { name: 'Arquivos anexados' })).toContainText('notes.txt')
  await page.getByRole('button', { name: 'Remover notes.txt' }).click()
  await expect(page.getByRole('list', { name: 'Arquivos anexados' })).toHaveCount(0)
})

test('preserves fields, rich content and attachments across size states; guards close and resets on discard', async ({
  page,
}) => {
  const body = page.getByRole('textbox', { name: 'Corpo da mensagem' })
  await page.getByRole('textbox', { name: 'Assunto', exact: true }).fill('Retained subject')
  await page.getByRole('button', { name: 'Cc/Bcc', exact: true }).click()
  await page.getByRole('textbox', { name: 'Bcc', exact: true }).fill('hidden@example.com')
  await body.fill('Retained content')
  await body.press('Control+a')
  await page.getByRole('button', { name: 'Negrito', exact: true }).click()
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Anexar arquivo', exact: true }).click()
  await (await chooser).setFiles({
    name: 'retained.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Retained attachment'),
  })
  await page.getByRole('button', { name: 'Maximizar janela' }).click()
  await page.getByRole('button', { name: 'Minimizar janela' }).click()
  await expect(page.getByRole('dialog', { name: 'Nova mensagem' })).toBeHidden()
  await expect(page.getByRole('button', { name: 'Restaurar mensagem' })).toBeFocused()
  await page.getByRole('button', { name: 'Fechar janela' }).click()
  await expect(page.getByRole('alertdialog', { name: 'Fechar sem salvar?' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continuar editando' })).toBeFocused()
  await page.getByRole('button', { name: 'Continuar editando' }).click()
  await page.getByRole('button', { name: 'Restaurar mensagem' }).click()
  await expect(page.getByRole('button', { name: 'Restaurar tamanho' })).toBeVisible()
  await page.getByRole('button', { name: 'Restaurar tamanho' }).click()
  await expect(body.locator('strong')).toHaveText('Retained content')
  await expect(page.getByRole('list', { name: 'Arquivos anexados' })).toContainText('retained.txt')
  await expect(page.getByRole('textbox', { name: 'Bcc', exact: true })).toHaveValue(
    'hidden@example.com',
  )
  await page.getByRole('button', { name: 'Fechar janela' }).click()
  await page.getByRole('button', { name: 'Descartar mensagem' }).click()
  await expect(page.getByRole('button', { name: 'Compose', exact: true })).toBeFocused()
  await page.getByRole('button', { name: 'Compose', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Para', exact: true })).toBeFocused()
  await expect(body).toHaveText('')
  await body.press('Control+z')
  await expect(body).toHaveText('')
  await expect(page.getByRole('list', { name: 'Arquivos anexados' })).toHaveCount(0)
  await expect(page.getByRole('textbox', { name: 'Assunto', exact: true })).toHaveValue('')
})

test('uses keyboard focus boundaries, Escape close guard and draft retention without backend actions', async ({
  page,
}) => {
  const toolbar = page.getByRole('toolbar', { name: 'Formatação da mensagem' })
  const bold = toolbar.getByRole('button', { name: 'Negrito', exact: true })
  await bold.focus()
  await bold.press('ArrowRight')
  await expect(toolbar.getByRole('button', { name: 'Itálico', exact: true })).toBeFocused()
  await page.keyboard.press('End')
  await expect(toolbar.getByRole('button', { name: 'Anexar arquivo', exact: true })).toBeFocused()
  await page.keyboard.press('Home')
  await expect(bold).toBeFocused()
  await page.getByRole('button', { name: 'Gerar CTA', exact: true }).focus()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Minimizar janela' })).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(page.getByRole('button', { name: 'Gerar CTA', exact: true })).toBeFocused()
  await page.getByRole('textbox', { name: 'Assunto', exact: true }).fill('Saved in this tab')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('alertdialog')).toBeVisible()
  await page.getByRole('button', { name: 'Continuar editando' }).click()
  await page.getByRole('button', { name: 'Rascunho', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText('Rascunho nesta aba')
  await page.getByRole('button', { name: 'Fechar janela' }).click()
  await expect(page.getByRole('alertdialog')).toHaveCount(0)
  await page.getByRole('button', { name: 'Compose', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Assunto', exact: true })).toHaveValue(
    'Saved in this tab',
  )
})

test('fits a small viewport and scrolls to editing actions without horizontal overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 480 })
  const dialog = page.getByRole('dialog', { name: 'Nova mensagem' })
  await expect(page.getByRole('complementary', { name: 'AI Assistente' })).toBeHidden()
  const dimensions = await dialog.evaluate((element) => ({
    width: element.getBoundingClientRect().width,
    scroll: element.scrollWidth,
    client: element.clientWidth,
  }))
  expect(dimensions.width).toBeLessThanOrEqual(320)
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client)
  await page.getByRole('button', { name: 'Rascunho', exact: true }).focus()
  await expect(page.getByRole('button', { name: 'Rascunho', exact: true })).toBeInViewport()
  await page.setViewportSize({ width: 1280, height: 720 })
  await expect(page.getByRole('complementary', { name: 'AI Assistente' })).toBeVisible()
})

test('exposes an accessible modal and confirmation with no Axe violations', async ({ page }) => {
  const normal = await new AxeBuilder({ page }).include('[data-slot="window-content"]').analyze()
  expect(normal.violations).toEqual([])
  await page.getByRole('textbox', { name: 'Assunto', exact: true }).fill('Unsaved')
  await page.getByRole('button', { name: 'Fechar janela' }).click()
  const confirmation = await new AxeBuilder({ page }).include('[role="alertdialog"]').analyze()
  expect(confirmation.violations).toEqual([])
  await expect(page.getByRole('button', { name: 'Continuar editando' })).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(page.getByRole('button', { name: 'Descartar mensagem' })).toBeFocused()
})
