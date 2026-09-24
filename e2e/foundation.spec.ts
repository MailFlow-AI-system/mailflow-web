import { expect, test } from '@playwright/test'

test('opens the application shell with fixed navigation and independently scrolling content', async ({
  page,
}) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  await expect(
    page.getByRole('heading', { name: 'Email workflows, built on a dependable foundation.' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Open application shell' }).click()

  await expect(page).toHaveURL('/app')
  const sidebar = page.getByRole('complementary', { name: 'Barra lateral da aplicação' })
  await expect(sidebar).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Início')
  await expect(page.getByRole('heading', { name: 'Início' })).toBeVisible()

  const content = page.getByRole('main')
  await expect(content).toHaveCSS('overflow-y', 'auto')
  await content.evaluate((element) => {
    const spacer = document.createElement('div')
    spacer.style.height = '200vh'
    element.appendChild(spacer)
    element.scrollTop = 400
  })
  await expect.poll(() => content.evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
  await expect
    .poll(() => sidebar.evaluate((element) => element.getBoundingClientRect().top))
    .toBe(0)

  await page.getByRole('button', { name: 'Alternar barra lateral' }).click()
  await expect(page.locator('[data-slot="sidebar"]')).toHaveAttribute('data-state', 'collapsed')
  await expect(sidebar).toHaveCSS('width', '48px')
})

test('opens and closes the sidebar as a mobile drawer', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/app')
  await page.waitForLoadState('networkidle')

  await expect(page.getByRole('complementary', { name: 'Barra lateral da aplicação' })).toBeHidden()
  const trigger = page.getByRole('button', { name: 'Alternar barra lateral' })
  await trigger.click()

  const drawer = page.getByRole('dialog', { name: 'Menu da aplicação' })
  await expect(drawer).toBeVisible()
  await expect(drawer.getByRole('button', { name: 'Fechar menu' })).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(drawer).toHaveCount(0)
  await expect(trigger).toBeFocused()

  await trigger.click()
  await page.setViewportSize({ width: 1024, height: 844 })
  await expect(drawer).toHaveCount(0)
})
