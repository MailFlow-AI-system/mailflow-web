import { type InfiniteData, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  post: vi.fn(),
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), warning: vi.fn() }),
}))
vi.mock('#/features/auth/adapters/getCurrentSession', () => ({ getCurrentSession: vi.fn() }))
vi.mock('../clients/messageActionsClient', () => ({ postMessageAction: mocks.post }))
vi.mock('@mailflow/ui/components', () => ({ toast: mocks.toast }))

import { mailMessagesKey } from '#/features/mail-list/queries/mailMessagesQuery'
import type { MailMessage, MailMessagesPage } from '#/features/mail-list/types/mailMessage'
import { useMessageActions } from './useMessageActions'

const message = (id: string): MailMessage => ({
  id,
  senderName: 'Ada',
  subject: `Subject ${id}`,
  body: '',
  receivedAt: '2026-11-01T00:00:00.000Z',
  isRead: false,
  isStarred: false,
  archivedAt: null,
  trashedAt: null,
  spamAt: null,
})
const inboxKey = mailMessagesKey('u1', 'acme', '', 'inbox')
const inboxIds = (client: QueryClient) =>
  client
    .getQueryData<InfiniteData<MailMessagesPage>>(inboxKey)
    ?.pages.flatMap((page) => page.items.map((item) => item.id))

function setup() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  client.setQueryData(inboxKey, {
    pages: [{ items: [message('a'), message('b')], nextCursor: null }],
    pageParams: [null],
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  const hook = renderHook(() => useMessageActions({ userId: 'u1', workspaceSlug: 'acme' }), {
    wrapper,
  })
  return { client, hook }
}

describe('useMessageActions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('removes archived messages before Core answers and offers Undo', async () => {
    let resolve: (value: unknown) => void = () => {}
    mocks.post.mockReturnValueOnce(new Promise((done) => (resolve = done)))
    const { client, hook } = setup()

    act(() => hook.result.current.run(['a'], 'archive'))

    await waitFor(() => expect(inboxIds(client)).toEqual(['b']))
    expect(mocks.post).toHaveBeenCalledWith('u1', ['a'], 'archive')
    resolve([{ id: 'a', status: 'ok' }])
    await waitFor(() => expect(mocks.toast.success).toHaveBeenCalled())
    const [text, options] = mocks.toast.success.mock.calls[0] ?? []
    expect(text).toBe('Message archived.')
    expect(options.action.label).toBe('Undo')

    mocks.post.mockResolvedValueOnce([{ id: 'a', status: 'ok' }])
    act(() => options.action.onClick())
    await waitFor(() => expect(mocks.post).toHaveBeenLastCalledWith('u1', ['a'], 'unarchive'))
  })

  it('restores the list and reports an error when Core rejects the action', async () => {
    mocks.post.mockRejectedValueOnce(new Error('Workspace request failed'))
    const { client, hook } = setup()

    act(() => hook.result.current.run(['a', 'b'], 'trash'))

    await waitFor(() =>
      expect(mocks.toast.error).toHaveBeenCalledWith(
        'Messages could not be moved to Trash. Try again.',
      ),
    )
    expect(inboxIds(client)).toEqual(['a', 'b'])
  })

  it('reports messages Core could not change and refreshes the lists', async () => {
    mocks.post.mockResolvedValueOnce([
      { id: 'a', status: 'ok' },
      { id: 'b', status: 'not_found' },
    ])
    const { client, hook } = setup()
    const invalidate = vi.spyOn(client, 'invalidateQueries')

    act(() => hook.result.current.run(['a', 'b'], 'read'))

    await waitFor(() =>
      expect(mocks.toast.warning).toHaveBeenCalledWith('1 message could not be updated.'),
    )
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['mail-messages', 'u1', 'acme'] })
    expect(mocks.toast.success).not.toHaveBeenCalled()
  })
})
