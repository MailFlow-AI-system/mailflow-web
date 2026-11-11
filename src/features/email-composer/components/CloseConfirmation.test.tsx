import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ComposerContext } from '../context'
import type { ComposerContextValue } from '../types/composer'
import { CloseConfirmation } from './CloseConfirmation'

afterEach(cleanup)

function setup(overrides: Partial<ComposerContextValue> = {}) {
  const context = {
    theme: 'light',
    confirm: true,
    setConfirm: vi.fn(),
    discard: vi.fn(),
    saveAndClose: vi.fn(),
    sending: false,
    triggerRef: { current: null },
    ...overrides,
  } as unknown as ComposerContextValue
  render(
    <ComposerContext.Provider value={context}>
      <CloseConfirmation />
    </ComposerContext.Provider>,
  )
  return context
}

describe('CloseConfirmation', () => {
  it('offers the three choices when closing with unsaved changes', () => {
    setup()
    expect(screen.getByRole('alertdialog', { name: 'Unsaved changes' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Discard changes' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Continue editing' })).toBeVisible()
  })

  it('saves the draft and closes the composer', async () => {
    const context = setup()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Save draft' }))
    expect(context.saveAndClose).toHaveBeenCalledTimes(1)
    expect(context.discard).not.toHaveBeenCalled()
  })

  it('discards the message', async () => {
    const context = setup()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Discard changes' }))
    expect(context.discard).toHaveBeenCalledTimes(1)
    expect(context.saveAndClose).not.toHaveBeenCalled()
  })

  it('keeps editing without discarding or saving', async () => {
    const context = setup()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Continue editing' }))
    expect(context.setConfirm).toHaveBeenCalledWith(false)
    expect(context.discard).not.toHaveBeenCalled()
    expect(context.saveAndClose).not.toHaveBeenCalled()
  })

  it('only offers to delete a draft that is already stored', async () => {
    const context = setup({ persistence: {} as ComposerContextValue['persistence'] })
    expect(screen.getByRole('alertdialog', { name: 'Discard draft?' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Save draft' })).toBeNull()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Discard message' }))
    expect(context.discard).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Keep editing' })).toBeVisible()
  })

  it('blocks every choice while a send is in flight', () => {
    setup({ sending: true })
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Discard changes' })).toBeDisabled()
  })
})
