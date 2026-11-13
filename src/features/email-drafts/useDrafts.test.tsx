import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { WorkspaceState } from '#/features/workspaces/types'
import { fetchDraftPage } from './draftsClient'
import { useDrafts } from './useDrafts'

const workspace = { id: 'workspace-a', name: 'Acme', slug: 'acme', role: 'owner' as const }
const state: WorkspaceState = {
  identityId: 'owner',
  current: workspace,
  status: 'ready',
  items: [workspace],
  retry: vi.fn(),
  loadMore: vi.fn(),
  hasMore: false,
  loadingMore: false,
  pageError: false,
}
vi.mock('#/features/workspaces/hooks/useWorkspaceContext', () => ({
  useWorkspaceContext: () => state,
}))
vi.mock('#/features/workspaces/hooks/useWorkspaceIdentityRecovery', () => ({
  useWorkspaceIdentityRecovery: vi.fn(),
}))
vi.mock('./draftsClient', () => ({ fetchDraftPage: vi.fn() }))
vi.mock('#/features/mail-list/clients/sentEmailsClient', () => ({ readSentWorkspace: vi.fn() }))
const draft = (id: string, overrides: Partial<Record<string, unknown>> = {}) => ({
  id,
  version: 2,
  to: 'ada@example.test',
  recipientName: '',
  subject: 'Quarterly plan',
  text: 'Numbers to review',
  updatedAt: '2026-11-10T12:00:00.000Z',
  attachmentCount: 0,
  ...overrides,
})
let queryClient: QueryClient
function wrapper({ children }: PropsWithChildren) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
beforeEach(() => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})
afterEach(async () => {
  cleanup()
  await queryClient.cancelQueries()
  queryClient.clear()
  vi.resetAllMocks()
})

describe('useDrafts', () => {
  it('presents drafts as list messages with readable fallbacks for empty fields', async () => {
    vi.mocked(fetchDraftPage).mockResolvedValue({
      items: [draft('one'), draft('two', { to: '', subject: '', text: '' })],
      nextOffset: null,
    })
    const { result } = renderHook(() => useDrafts('owner'), { wrapper })
    await waitFor(() => expect(result.current.messages).toHaveLength(2))
    expect(result.current.messages[0]).toEqual({
      id: 'one',
      senderName: 'ada@example.test',
      subject: 'Quarterly plan',
      body: 'Numbers to review',
      receivedAt: '2026-11-10T12:00:00.000Z',
    })
    expect(result.current.messages[1]).toMatchObject({
      senderName: '(No recipient)',
      subject: '(No subject)',
      body: '',
    })
    expect(result.current.items[0]?.version).toBe(2)
  })

  it('shows the recipient name when there is one, like Inbox and Sent', async () => {
    vi.mocked(fetchDraftPage).mockResolvedValue({
      items: [
        draft('named', { recipientName: 'Ada Lovelace' }),
        draft('blank-name', { recipientName: '   ' }),
        draft('name-only', { to: '', recipientName: 'Grace Hopper' }),
      ],
      nextOffset: null,
    })
    const { result } = renderHook(() => useDrafts('owner'), { wrapper })
    await waitFor(() => expect(result.current.messages).toHaveLength(3))
    expect(result.current.messages.map((message) => message.senderName)).toEqual([
      'Ada Lovelace',
      'ada@example.test',
      'Grace Hopper',
    ])
  })

  it('requests each search separately and never shows another search while loading', async () => {
    vi.mocked(fetchDraftPage).mockImplementation(
      async (_user, _workspace, _offset, _signal, q) => ({
        items: [draft(q ? `match-${q}` : 'everything')],
        nextOffset: null,
      }),
    )
    const { result, rerender } = renderHook(({ q }) => useDrafts('owner', q), {
      wrapper,
      initialProps: { q: '' },
    })
    await waitFor(() => expect(result.current.messages[0]?.id).toBe('everything'))
    rerender({ q: ' budget ' })
    expect(result.current.messages).toEqual([])
    expect(result.current.isPending).toBe(true)
    await waitFor(() => expect(result.current.messages[0]?.id).toBe('match-budget'))
    expect(fetchDraftPage).toHaveBeenLastCalledWith(
      'owner',
      workspace.id,
      0,
      expect.any(AbortSignal),
      'budget',
    )
  })
})
