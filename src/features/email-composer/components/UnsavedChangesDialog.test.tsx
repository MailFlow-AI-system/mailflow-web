import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { UnsavedChangesDialog } from './UnsavedChangesDialog'

afterEach(cleanup)

function setup(props: Partial<Parameters<typeof UnsavedChangesDialog>[0]> = {}) {
  const handlers = { onContinue: vi.fn(), onDiscard: vi.fn(), onSave: vi.fn() }
  render(
    <UnsavedChangesDialog
      open
      theme="light"
      title="Unsaved changes"
      description="Your message has changes that were not saved."
      {...handlers}
      {...props}
    />,
  )
  return handlers
}

describe('UnsavedChangesDialog', () => {
  it('offers save draft, discard changes and continue editing', () => {
    setup()
    expect(screen.getByRole('alertdialog', { name: 'Unsaved changes' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Discard changes' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Continue editing' })).toBeEnabled()
  })

  it('focuses the safe action first so Enter never discards by accident', async () => {
    setup()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Continue editing' })).toHaveFocus(),
    )
  })

  it('routes each choice to its own handler', async () => {
    const user = userEvent.setup()
    const handlers = setup()
    await user.click(screen.getByRole('button', { name: 'Save draft' }))
    expect(handlers.onSave).toHaveBeenCalledTimes(1)
    await user.click(screen.getByRole('button', { name: 'Discard changes' }))
    expect(handlers.onDiscard).toHaveBeenCalledTimes(1)
    await user.click(screen.getByRole('button', { name: 'Continue editing' }))
    expect(handlers.onContinue).toHaveBeenCalledTimes(1)
    expect(handlers.onDiscard).toHaveBeenCalledTimes(1)
  })

  it('treats Escape as continue editing', async () => {
    const user = userEvent.setup()
    const handlers = setup()
    await user.keyboard('{Escape}')
    expect(handlers.onContinue).toHaveBeenCalledTimes(1)
    expect(handlers.onDiscard).not.toHaveBeenCalled()
  })

  it('hides save draft when the caller cannot save', () => {
    setup({ onSave: undefined })
    expect(screen.queryByRole('button', { name: 'Save draft' })).toBeNull()
  })

  it('locks every action and ignores dismissal while busy', async () => {
    const user = userEvent.setup()
    const handlers = setup({ busy: true })
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Discard changes' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Continue editing' })).toBeDisabled()
    await user.keyboard('{Escape}')
    expect(handlers.onContinue).not.toHaveBeenCalled()
  })
})
