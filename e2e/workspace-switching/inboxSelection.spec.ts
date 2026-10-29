import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { control, fixture, login } from './fixture'

test.setTimeout(60000)

test.beforeEach(async () => {
  await control('reset')
})

test('selects, searches, selects all and clears messages in the real workspace inbox', async ({
  page,
}) => {
  const data = await fixture()
  await login(page, `http://${data.host}:3003/login`)
  await expect(page.getByText('Acme private message', { exact: true }).first()).toBeVisible({
    timeout: 15000,
  })

  const rowCheckboxes = page.getByRole('checkbox', { name: /^Select message from / })
  const selectAll = page.getByRole('checkbox', { name: 'Select all loaded messages' })
  const search = page.getByRole('searchbox', { name: 'Buscar em inbox…', exact: true })
  const loaded = await rowCheckboxes.count()
  expect(loaded).toBeGreaterThan(1)
  await expect(page.getByRole('heading', { level: 1, name: 'Inbox' })).toBeVisible()
  await expect(selectAll).toHaveAttribute('aria-checked', 'false')
  await expect(page.getByRole('button', { name: 'Clear selection' })).toHaveCount(0)

  // One, then several.
  await rowCheckboxes.nth(0).click()
  await expect(rowCheckboxes.nth(0)).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByText('1 selected', { exact: true })).toBeVisible()
  await expect(selectAll).toHaveAttribute('aria-checked', 'mixed')
  await rowCheckboxes.nth(1).click()
  await expect(page.getByText('2 selected', { exact: true })).toBeVisible()

  // Deselect with the keyboard.
  await rowCheckboxes.nth(1).focus()
  await page.keyboard.press('Space')
  await expect(rowCheckboxes.nth(1)).toHaveAttribute('aria-checked', 'false')
  await expect(page.getByText('1 selected', { exact: true })).toBeVisible()

  // The selection survives a search and returns with the list.
  await search.fill('Acme private')
  await expect(page).toHaveURL(/q=Acme/)
  await expect(page.getByRole('region', { name: 'Inbox message list' })).toHaveAttribute(
    'aria-busy',
    'false',
    { timeout: 15000 },
  )
  await expect(page.getByText('1 selected', { exact: true })).toBeVisible()
  await search.fill('')
  // Wait for the cleared search to settle: the first row also exists in the search results, so
  // checking it alone would pass against the stale list and race the debounced search update.
  await expect(page).not.toHaveURL(/q=/)
  await expect(page.getByRole('region', { name: 'Inbox message list' })).toHaveAttribute(
    'aria-busy',
    'false',
    { timeout: 15000 },
  )
  await expect(rowCheckboxes).toHaveCount(loaded, { timeout: 15000 })
  await expect(rowCheckboxes.nth(0)).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByText('1 selected', { exact: true })).toBeVisible()

  // Select all loaded messages, then check accessibility with a selection in place.
  await selectAll.click()
  await expect(selectAll).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByText(`${loaded} selected`, { exact: true })).toBeVisible()
  expect(
    (await new AxeBuilder({ page }).include('[aria-label="Inbox"]').analyze()).violations,
  ).toEqual([])

  // Clear the whole selection.
  await page.getByRole('button', { name: 'Clear selection' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Inbox' })).toBeVisible()
  await expect(page.getByText(/ selected$/)).toHaveCount(0)
  await expect(selectAll).toHaveAttribute('aria-checked', 'false')
  await expect(rowCheckboxes.nth(0)).toHaveAttribute('aria-checked', 'false')
})

test('does not carry a selection into another workspace', async ({ page }) => {
  const data = await fixture()
  await login(page, `http://${data.host}:3003/login`)
  await expect(page.getByText('Acme private message', { exact: true }).first()).toBeVisible({
    timeout: 15000,
  })
  await page
    .getByRole('checkbox', { name: /^Select message from / })
    .first()
    .click()
  await expect(page.getByText('1 selected', { exact: true })).toBeVisible()

  await page.goto(`http://${data.targetHost}:3003/inbox`)
  await expect(page.getByText('Northwind private message', { exact: true }).first()).toBeVisible({
    timeout: 15000,
  })
  await expect(page.getByRole('heading', { level: 1, name: 'Inbox' })).toBeVisible()
  await expect(page.getByText('1 selected', { exact: true })).toHaveCount(0)
})

test.describe('touch layout', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('enters an explicit selection mode and selects by tapping whole rows', async ({ page }) => {
    const data = await fixture()
    await login(page, `http://${data.host}:3003/login`)
    await expect(page.getByText('Acme private message', { exact: true }).first()).toBeVisible({
      timeout: 15000,
    })

    // Nothing is hidden behind a hover: no checkboxes until selection mode starts.
    await expect(page.getByRole('checkbox')).toHaveCount(0)
    await page.getByRole('button', { name: 'Select', exact: true }).tap()
    await expect(page.getByText('Select items', { exact: true })).toBeVisible()
    const rowCheckboxes = page.getByRole('checkbox', { name: /^Select message from / })
    const loaded = await rowCheckboxes.count()
    expect(loaded).toBeGreaterThan(1)

    // Tapping the text of a row, not the box, selects it.
    await page.getByText('Acme private message', { exact: true }).first().tap()
    await expect(rowCheckboxes.first()).toHaveAttribute('aria-checked', 'true')
    await expect(page.getByText('1 selected', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Select all', exact: true }).tap()
    await expect(page.getByText(`${loaded} selected`, { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Deselect all', exact: true })).toBeVisible()
    expect(
      (await new AxeBuilder({ page }).include('[aria-label="Inbox"]').analyze()).violations,
    ).toEqual([])

    await page.getByRole('button', { name: 'Clear selection and exit selection mode' }).tap()
    await expect(page.getByRole('checkbox')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Select', exact: true })).toBeVisible()
  })

  test('holding a row starts selecting with that row', async ({ page }) => {
    const data = await fixture()
    await login(page, `http://${data.host}:3003/login`)
    const first = page.getByText('Acme private message', { exact: true }).first()
    await expect(first).toBeVisible({ timeout: 15000 })

    const box = await first.boundingBox()
    if (!box) throw new Error('The first message has no box')
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.waitForTimeout(700)
    await page.mouse.up()

    await expect(page.getByText('1 selected', { exact: true })).toBeVisible()
    await expect(
      page.getByRole('checkbox', { name: /^Select message from / }).first(),
    ).toBeVisible()
  })
})
