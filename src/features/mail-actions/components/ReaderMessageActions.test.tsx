import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render as baseRender, cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { MailFolderName } from '#/features/mail-list/types/mailFolder'

const request = vi.fn()
const state = vi.hoisted(() => ({
  folder: 'inbox' as MailFolderName,
  detail: { isRead: true, isStarred: false } as
    | { isRead?: boolean; isStarred?: boolean }
    | undefined,
}))
vi.mock('./MailActionsProvider', () => ({
  useMailActions: () => ({ folder: state.folder, request }),
}))
vi.mock('#/features/mail-reader/useMailDetail', () => ({
  useMailDetail: () => ({ data: state.detail }),
}))

import { ReaderMessageActions } from './ReaderMessageActions'

const render = (ui: ReactElement) =>
  baseRender(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>)

describe('ReaderMessageActions', () => {
  afterEach(() => {
    cleanup()
    request.mockReset()
  })

  it('acts on the open message from the reader toolbar', async () => {
    const user = userEvent.setup()
    state.folder = 'inbox'
    render(<ReaderMessageActions userId="u1" id="m1" />)

    await user.click(screen.getByRole('button', { name: 'Archive' }))
    await user.click(screen.getByRole('button', { name: 'Report spam' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await user.click(screen.getByRole('button', { name: 'Mark as unread' }))
    const star = screen.getByRole('button', { name: 'Star' })
    expect(star).toHaveAttribute('aria-pressed', 'false')
    await user.click(star)

    expect(request.mock.calls.map(([ids, action]) => [ids, action])).toEqual([
      [['m1'], 'archive'],
      [['m1'], 'spam'],
      [['m1'], 'trash'],
      [['m1'], 'unread'],
      [['m1'], 'star'],
    ])
  })

  it('disables state toggles until the message loads and offers Trash recovery', () => {
    state.folder = 'trash'
    state.detail = undefined
    render(<ReaderMessageActions userId="u1" id="m1" />)
    expect(screen.getByRole('button', { name: 'Restore' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Delete permanently' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Mark as read' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Star' })).toBeNull()
  })
})
