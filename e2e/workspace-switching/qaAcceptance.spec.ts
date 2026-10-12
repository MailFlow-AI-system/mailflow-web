import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { control, fixture, login } from './fixture'
import { LOCAL_QA_READINESS_MS, workspaceQaCases } from './qaCases'
import { expectNoHorizontalOverflow, highlightNorthwind, reachByTab } from './qaKeyboard'

for (const scenario of workspaceQaCases) {
  test.describe(scenario.name, () => {
    test.use({
      viewport: scenario.viewport,
      isMobile: scenario.isMobile,
      hasTouch: scenario.isMobile,
    })

    test('QA current marker, keyboard selection and responsive palettes', async ({
      page,
    }, testInfo) => {
      test.setTimeout(90000)
      await control('reset')
      const data = await fixture()
      await page.addInitScript(
        (theme) => localStorage.setItem('mailflow-theme', theme),
        scenario.theme,
      )
      await login(page, `http://${data.host}:3003/login`)
      await expect(page.getByRole('button', { name: 'Compose', exact: true })).toBeEnabled({
        timeout: LOCAL_QA_READINESS_MS,
      })
      await expect(page.locator('html')).toHaveAttribute('data-theme', scenario.theme)

      const openSidebar = async () => {
        if (!scenario.isMobile) return
        await reachByTab(page, page.getByRole('button', { name: 'Alternar barra lateral' }))
        await page.keyboard.press('Enter')
      }
      const trigger = page.getByRole('combobox', { name: 'Workspace: Acme Corp' })
      await openSidebar()
      await reachByTab(page, trigger)
      await page.keyboard.press('Enter')
      await expect(page.getByRole('option')).toHaveCount(2)
      await expect(page.getByRole('option', { name: 'Acme Corp', exact: true })).toHaveAttribute(
        'aria-selected',
        'true',
      )
      await expect(page.getByRole('option', { name: 'Northwind', exact: true })).toHaveAttribute(
        'aria-selected',
        'false',
      )
      await highlightNorthwind(page)
      expect(
        (await new AxeBuilder({ page }).include('[data-slot="select-content"]').analyze())
          .violations,
      ).toEqual([])
      await expectNoHorizontalOverflow(page)
      await page.screenshot({
        path: testInfo.outputPath('qa-selector.png'),
        mask: [page.getByText(data.email, { exact: true })],
        animations: 'disabled',
      })
      await page.keyboard.press('Escape')
      await expect(trigger).toBeFocused()
      expect((await fixture()).selections).toBe(0)

      await reachByTab(page, trigger)
      await page.keyboard.press('Enter')
      await highlightNorthwind(page)
      await page.keyboard.press('Enter')
      await expect(page).toHaveURL(`http://${data.targetHost}:3003/inbox`)
      await expect(page.getByRole('button', { name: 'Compose', exact: true })).toBeEnabled({
        timeout: LOCAL_QA_READINESS_MS,
      })
      await expect(page.getByRole('alertdialog')).toHaveCount(0)
      await openSidebar()
      await expect(page.getByRole('combobox', { name: 'Workspace: Northwind' })).toBeVisible()
      await expectNoHorizontalOverflow(page)
      expect((await fixture()).preference).toBe(data.targetId)
    })

    if (scenario.isMobile) {
      test('QA emulated touch switches to the authorized workspace', async ({ page }) => {
        test.setTimeout(60000)
        await control('reset')
        const data = await fixture()
        await page.addInitScript(
          (theme) => localStorage.setItem('mailflow-theme', theme),
          scenario.theme,
        )
        await login(page, `http://${data.host}:3003/login`)
        await expect(page.getByRole('button', { name: 'Compose', exact: true })).toBeEnabled({
          timeout: LOCAL_QA_READINESS_MS,
        })
        await page.getByRole('button', { name: 'Alternar barra lateral' }).tap()
        await page.getByRole('combobox', { name: 'Workspace: Acme Corp' }).tap()
        await page.getByRole('option', { name: 'Northwind', exact: true }).tap()
        await expect(page).toHaveURL(`http://${data.targetHost}:3003/inbox`)
        await expect(page.getByRole('button', { name: 'Compose', exact: true })).toBeEnabled({
          timeout: LOCAL_QA_READINESS_MS,
        })
        await page.getByRole('button', { name: 'Alternar barra lateral' }).tap()
        await expect(page.getByRole('combobox', { name: 'Workspace: Northwind' })).toBeVisible()
        await expectNoHorizontalOverflow(page)
        expect((await fixture()).preference).toBe(data.targetId)
      })
    }
  })
}
