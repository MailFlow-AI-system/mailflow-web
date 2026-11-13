import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { MailFolderName } from '#/features/mail-list/types/mailFolder'
import type { MailMessage } from '#/features/mail-list/types/mailMessage'

const request = vi.fn()
const clear = vi.fn()
const state = vi.hoisted(() => ({ folder: 'inbox' as MailFolderName, ids: [] as string[] }))
vi.mock('./MailActionsProvider', () => ({
  useMailActions: () => ({ folder: state.folder, request }),
}))
vi.mock('#/features/mail-selection/hooks/useMailSelection', () => ({
  useMailSelection: () => ({ ids: state.ids, count: state.ids.length, clear }),
}))

import { MessageBulkActions } from './MessageBulkActions'

const message = (id: string, extra: Partial<MailMessage> = {}): MailMessage => ({
  id,
  senderName: 'Ada',
  subject: id,
  body: '',
  receivedAt: '2026-11-01T00:00:00.000Z',
  isRead: true,
  isStarred: true,
  ...extra,
})

describe('MessageBulkActions', () => {
  afterEach(() => {
    cleanup()
    request.mockReset()
    clear.mockReset()
  })

  it('acts on every selected id and clears the selection after a move', async () => {
    const user = userEvent.setup()
    state.folder = 'inbox'
    state.ids = ['a', 'hidden']
    render(<MessageBulkActions messages={[message('a'), message('b')]} />)

    await user.click(screen.getByRole('button', { name: 'Archive: selected messages' }))
    expect(request).toHaveBeenCalledWith(['a', 'hidden'], 'archive', {
      onDone: expect.any(Function),
    })
    request.mock.calls[0]?.[2].onDone()
    expect(clear).toHaveBeenCalled()
  })

  it('picks the read and star actions from the loaded selected messages', async () => {
    const user = userEvent.setup()
    state.folder = 'inbox'
    state.ids = ['a', 'b']
    const { rerender } = render(
      <MessageBulkActions messages={[message('a'), message('b', { isRead: false })]} />,
    )
    await user.click(screen.getByRole('button', { name: 'Mark as read: selected messages' }))
    await user.click(screen.getByRole('button', { name: 'Unstar: selected messages' }))
    expect(request.mock.calls.map(([, action]) => action)).toEqual(['read', 'unstar'])
    expect(clear).not.toHaveBeenCalled()

    rerender(<MessageBulkActions messages={[message('a'), message('b', { isStarred: false })]} />)
    expect(screen.getByRole('button', { name: 'Mark as unread: selected messages' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Star: selected messages' })).toBeVisible()
  })

  it('shows Trash recovery actions and hides the star there', () => {
    state.folder = 'trash'
    state.ids = ['a']
    render(<MessageBulkActions messages={[message('a')]} />)
    expect(screen.getByRole('button', { name: 'Restore: selected messages' })).toBeVisible()
    expect(
      screen.getByRole('button', { name: 'Delete permanently: selected messages' }),
    ).toBeVisible()
    expect(screen.queryByRole('button', { name: /star/i })).toBeNull()
  })

  it('renders nothing without a selection', () => {
    state.ids = []
    const { container } = render(<MessageBulkActions messages={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})
