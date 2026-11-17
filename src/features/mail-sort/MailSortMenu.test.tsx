import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { MailSortMenu } from './MailSortMenu'

afterEach(cleanup)

describe('MailSortMenu', () => {
  it('lists every order under a Sort by label and marks the current one', async () => {
    const user = userEvent.setup()
    render(<MailSortMenu value="oldest" onChange={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Sort messages' }))

    expect(await screen.findByRole('group', { name: 'Sort by' })).toBeVisible()
    const options = screen.getAllByRole('menuitemradio')
    expect(options.map((option) => option.textContent)).toEqual([
      'Newest first',
      'Oldest first',
      'Sender (A-Z)',
      'Sender (Z-A)',
      'Subject (A-Z)',
      'Subject (Z-A)',
    ])
    expect(screen.getByRole('menuitemradio', { name: 'Oldest first' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(screen.getByRole('menuitemradio', { name: 'Newest first' })).toHaveAttribute(
      'aria-checked',
      'false',
    )
  })

  it('reports the chosen order', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<MailSortMenu value="newest" onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Sort messages' }))
    await user.click(await screen.findByRole('menuitemradio', { name: 'Subject (Z-A)' }))

    expect(onChange).toHaveBeenCalledWith('subject-desc')
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull())
  })

  it('ignores choosing the current order again', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<MailSortMenu value="oldest" onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Sort messages' }))
    await user.click(await screen.findByRole('menuitemradio', { name: 'Oldest first' }))

    expect(onChange).not.toHaveBeenCalled()
  })

  it('names the recipient instead of the sender for outgoing lists', async () => {
    const user = userEvent.setup()
    render(<MailSortMenu value="sender-desc" onChange={vi.fn()} correspondent="recipient" />)

    await user.click(screen.getByRole('button', { name: 'Sort messages' }))

    expect(await screen.findByRole('menuitemradio', { name: 'Recipient (A-Z)' })).toBeVisible()
    expect(screen.getByRole('menuitemradio', { name: 'Recipient (Z-A)' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(screen.queryByRole('menuitemradio', { name: /Sender/ })).toBeNull()
  })
})
