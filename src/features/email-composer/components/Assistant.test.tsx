import { toast } from '@mailflow/ui/components'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { Assistant } from './Assistant'

afterEach(cleanup)

it('shows the unavailable warning for every assistant action without submitting', async () => {
  const warning = vi.spyOn(toast, 'warning').mockReturnValue('feature-unavailable')
  const submit = vi.fn((event: React.FormEvent) => event.preventDefault())
  const user = userEvent.setup()
  render(
    <form onSubmit={submit}>
      <Assistant />
    </form>,
  )
  const buttons = screen.getAllByRole('button')
  expect(buttons).toHaveLength(8)
  for (const button of buttons) {
    expect(button).not.toHaveAttribute('aria-disabled', 'true')
    await user.click(button)
  }
  buttons[0].focus()
  await user.keyboard('{Enter}')
  expect(warning).toHaveBeenCalledTimes(9)
  expect(warning).toHaveBeenCalledWith(
    'Esta funcionalidade está em desenvolvimento e ainda não está disponível.',
    { id: 'feature-unavailable' },
  )
  expect(submit).not.toHaveBeenCalled()
  warning.mockRestore()
})
