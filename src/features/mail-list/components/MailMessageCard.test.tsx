import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { MailMessageCard } from './MailMessageCard'

describe('MailMessageCard', () => {
  afterEach(cleanup)

  it('renders sender initials, subject, and the plain-text body preview without reader controls or metadata', () => {
    render(
      <ul>
        <MailMessageCard
          message={{
            id: 'message-1',
            senderName: 'Ada Lovelace',
            subject: 'Analytical Engine',
            body: '<img src=x onerror=alert(1)> A long plain-text body',
            receivedAt: '2026-10-01T12:00:00.000Z',
          }}
        />
      </ul>,
    )

    expect(screen.getByText('AL').closest('[aria-hidden="true"]')).toBeInTheDocument()
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByText('Analytical Engine')).toBeInTheDocument()
    expect(screen.getByText('<img src=x onerror=alert(1)> A long plain-text body')).toHaveClass(
      'truncate',
    )
    expect(document.querySelector('img')).toBeNull()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByText(/2026|favorite|star/i)).not.toBeInTheDocument()
  })

  it('keeps the fallback sender marker decorative for an empty sender name', () => {
    render(
      <ul>
        <MailMessageCard
          message={{
            id: 'message-2',
            senderName: '  ',
            subject: 'Unknown sender',
            body: 'Message preview',
            receivedAt: '2026-10-01T12:00:00.000Z',
          }}
        />
      </ul>,
    )

    expect(screen.getByText('?').closest('[aria-hidden="true"]')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
  describe('selection', () => {
    const message = {
      id: 'message-3',
      senderName: 'Grace Hopper',
      subject: 'Compiler plan',
      body: 'A body',
      receivedAt: '2026-10-01T12:00:00.000Z',
    }

    it('shows no checkbox when selection is not provided', () => {
      render(
        <ul>
          <MailMessageCard message={message} />
        </ul>,
      )

      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
      expect(screen.getByRole('listitem')).not.toHaveAttribute('data-selected')
      expect(screen.getByText('GH').closest('[aria-hidden="true"]')).not.toHaveClass('opacity-0')
    })

    it('names the checkbox after the sender and subject and reports changes', async () => {
      const user = userEvent.setup()
      const onSelectedChange = vi.fn()
      render(
        <ul>
          <MailMessageCard message={message} onSelectedChange={onSelectedChange} />
        </ul>,
      )

      const checkbox = screen.getByRole('checkbox', {
        name: 'Select message from Grace Hopper: Compiler plan',
      })
      expect(checkbox).toHaveAttribute('aria-checked', 'false')
      expect(screen.getByRole('listitem')).toHaveAttribute('data-selected', 'false')

      await user.click(checkbox)
      expect(onSelectedChange).toHaveBeenCalledWith(true)
    })

    it('swaps the avatar for the checkbox on hover, keyboard focus, or selection mode', () => {
      render(
        <ul>
          <MailMessageCard message={message} onSelectedChange={vi.fn()} />
        </ul>,
      )

      const checkbox = screen.getByRole('checkbox')
      const avatar = screen.getByText('GH').closest('[aria-hidden="true"]')
      expect(checkbox).toHaveClass(
        'opacity-0',
        'group-hover/row:opacity-100',
        'group-has-[:focus-visible]/row:opacity-100',
        'group-data-[selecting=true]/list:opacity-100',
      )
      expect(avatar).toHaveClass(
        'group-hover/row:opacity-0',
        'group-has-[:focus-visible]/row:opacity-0',
        'group-data-[selecting=true]/list:opacity-0',
      )
    })

    it('toggles when the avatar slot is clicked, so touch has no hover dependency', async () => {
      const user = userEvent.setup()
      const onSelectedChange = vi.fn()
      render(
        <ul>
          <MailMessageCard message={message} onSelectedChange={onSelectedChange} />
        </ul>,
      )

      const avatar = screen.getByText('GH').closest('[aria-hidden="true"]')
      expect(avatar).toHaveClass('pointer-events-none')
      // The slot is a label for the checkbox, so a tap anywhere in it toggles.
      await user.click(screen.getByText('GH').closest('label') as HTMLElement)

      expect(onSelectedChange).toHaveBeenCalledWith(true)
    })

    it('shows the checkbox in place of the avatar and tints the row when selected', async () => {
      const user = userEvent.setup()
      const onSelectedChange = vi.fn()
      render(
        <ul>
          <MailMessageCard message={message} onSelectedChange={onSelectedChange} selected />
        </ul>,
      )

      const row = screen.getByRole('listitem')
      expect(row).toHaveClass('bg-primary/10')
      expect(row).toHaveAttribute('data-selected', 'true')
      const checkbox = screen.getByRole('checkbox', { name: /Grace Hopper/ })
      expect(checkbox).toHaveAttribute('aria-checked', 'true')
      expect(checkbox).toHaveClass('opacity-100')
      expect(screen.getByText('GH').closest('[aria-hidden="true"]')).toHaveClass('opacity-0')

      checkbox.focus()
      await user.keyboard(' ')
      expect(onSelectedChange).toHaveBeenCalledWith(false)
    })
  })
  describe('touch variant', () => {
    const message = {
      id: 'message-4',
      senderName: 'Alan Turing',
      subject: 'Machine draft',
      body: 'A body',
      receivedAt: '2026-10-01T12:00:00.000Z',
    }

    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    it('shows no checkbox at rest, so nothing is hidden behind a hover', () => {
      render(
        <ul>
          <MailMessageCard message={message} onSelectedChange={vi.fn()} variant="touch" />
        </ul>,
      )

      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
      expect(screen.getByText('AT').closest('[aria-hidden="true"]')).not.toHaveClass('opacity-0')
    })

    it('starts selecting after a long press and ignores a short tap', () => {
      const onLongPress = vi.fn()
      render(
        <ul>
          <MailMessageCard
            message={message}
            onLongPress={onLongPress}
            onSelectedChange={vi.fn()}
            variant="touch"
          />
        </ul>,
      )
      const row = screen.getByText('Machine draft')

      fireEvent.pointerDown(row)
      act(() => vi.advanceTimersByTime(200))
      fireEvent.pointerUp(row)
      act(() => vi.advanceTimersByTime(1000))
      expect(onLongPress).not.toHaveBeenCalled()

      fireEvent.pointerDown(row)
      act(() => vi.advanceTimersByTime(500))
      expect(onLongPress).toHaveBeenCalledTimes(1)
    })

    it('makes the whole row the tap target in selection mode', () => {
      const onSelectedChange = vi.fn()
      render(
        <ul>
          <MailMessageCard
            message={message}
            onSelectedChange={onSelectedChange}
            selecting
            variant="touch"
          />
        </ul>,
      )

      const checkbox = screen.getByRole('checkbox', {
        name: 'Select message from Alan Turing: Machine draft',
      })
      expect(checkbox).toHaveClass('size-[22px]', 'rounded-[6px]')
      const row = screen.getByText('Machine draft').closest('label') as HTMLElement
      expect(row).toHaveClass('min-h-[88px]', 'w-full')

      fireEvent.click(screen.getByText('A body'))
      expect(onSelectedChange).toHaveBeenCalledWith(true)
    })

    it('tints a selected row and keeps the avatar next to the checkbox', () => {
      render(
        <ul>
          <MailMessageCard
            message={message}
            onSelectedChange={vi.fn()}
            selected
            selecting
            variant="touch"
          />
        </ul>,
      )

      expect(screen.getByRole('listitem')).toHaveClass('bg-primary/10')
      expect(screen.getByRole('checkbox')).toHaveAttribute('aria-checked', 'true')
      expect(screen.getByText('AT')).toBeInTheDocument()
    })
  })
})
