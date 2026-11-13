import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { MailFolderName } from '#/features/mail-list/types/mailFolder'
import type { MailMessage } from '#/features/mail-list/types/mailMessage'

const request = vi.fn()
const context = vi.hoisted(() => ({ folder: 'inbox' as MailFolderName }))
vi.mock('./MailActionsProvider', () => ({
  useMailActions: () => ({ folder: context.folder, request }),
}))

import { MessageRowActions } from './MessageRowActions'

const message: MailMessage = {
  id: 'm1',
  senderName: 'Ada',
  subject: 'Invoice',
  body: '',
  receivedAt: '2026-11-01T00:00:00.000Z',
  isRead: false,
  isStarred: false,
}

function renderIn(folder: MailFolderName, state: Partial<MailMessage> = {}) {
  context.folder = folder
  return render(<MessageRowActions message={{ ...message, ...state }} />)
}

describe('MessageRowActions', () => {
  afterEach(() => {
    cleanup()
    request.mockReset()
  })

  it('offers archive, read state, delete and a pressed star in the inbox', async () => {
    const user = userEvent.setup()
    renderIn('inbox', { isStarred: true })
    const star = screen.getByRole('button', { name: 'Star message: Invoice' })
    expect(star).toHaveAttribute('aria-pressed', 'true')

    await user.click(star)
    await user.click(screen.getByRole('button', { name: 'Archive message: Invoice' }))
    await user.click(screen.getByRole('button', { name: 'Mark as read: Invoice' }))
    await user.click(screen.getByRole('button', { name: 'Delete message: Invoice' }))

    expect(request.mock.calls.map(([ids, action]) => [ids, action])).toEqual([
      [['m1'], 'unstar'],
      [['m1'], 'archive'],
      [['m1'], 'read'],
      [['m1'], 'trash'],
    ])
  })

  it('offers restore and permanent deletion in Trash, without a star', async () => {
    const user = userEvent.setup()
    renderIn('trash', { isRead: true })
    expect(screen.queryByRole('button', { name: /^Star/ })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Restore message: Invoice' }))
    await user.click(screen.getByRole('button', { name: 'Mark as unread: Invoice' }))
    await user.click(screen.getByRole('button', { name: 'Delete permanently: Invoice' }))
    expect(request.mock.calls.map(([, action]) => action)).toEqual([
      'restore',
      'unread',
      'delete_permanently',
    ])
  })

  it('offers Not spam in Spam', async () => {
    const user = userEvent.setup()
    renderIn('spam')
    await user.click(screen.getByRole('button', { name: 'Not spam: Invoice' }))
    expect(request).toHaveBeenCalledWith(['m1'], 'not_spam')
  })
})
