import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Workspace, WorkspaceState } from '#/features/workspaces/types'
import { fetchSentEmails, readSentWorkspace } from '../clients/sentEmailsClient'
import { useSentEmails } from './useSentEmails'

let state: WorkspaceState | null = null
vi.mock('#/features/workspaces/hooks/useWorkspaceContext', () => ({
  useWorkspaceContext: () => state,
}))
vi.mock('#/features/workspaces/hooks/useWorkspaceIdentityRecovery', () => ({
  useWorkspaceIdentityRecovery: vi.fn(),
}))
vi.mock('../clients/sentEmailsClient', () => ({
  fetchSentEmails: vi.fn(),
  readSentWorkspace: vi.fn(),
}))
const a: Workspace = { id: 'workspace-a', name: 'Acme', slug: 'acme', role: 'owner' }
const b: Workspace = { id: 'workspace-b', name: 'Northwind', slug: 'northwind', role: 'owner' }
const page = (id: string, nextOffset: number | null = null) => ({
  items: [
    {
      id,
      to: ['ada@example.test'],
      cc: [],
      bcc: [],
      recipientName: '',
      subject: id,
      text: '',
      sentAt: null,
    },
  ],
  nextOffset,
})
const ready = (workspace = a, identityId = 'owner'): WorkspaceState => ({
  identityId,
  current: workspace,
  status: 'ready',
  items: [workspace],
  retry: vi.fn(),
  loadMore: vi.fn(),
  hasMore: false,
  loadingMore: false,
  pageError: false,
})
let queryClient: QueryClient
function wrapper({ children }: PropsWithChildren) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
beforeEach(() => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  state = ready()
})
afterEach(async () => {
  cleanup()
  await queryClient.cancelQueries()
  queryClient.clear()
  vi.resetAllMocks()
})

describe('Sent workspace query scope', () => {
  it('never displays cached A messages as B and partitions pages by user and workspace', async () => {
    vi.mocked(fetchSentEmails).mockImplementation(async (_userId, workspaceId) => page(workspaceId))
    const { result, rerender } = renderHook(() => useSentEmails('owner'), { wrapper })
    await waitFor(() => expect(result.current.messages.map(({ id }) => id)).toEqual([a.id]))
    state = ready(b)
    rerender()
    expect(result.current.messages).toEqual([])
    await waitFor(() => expect(result.current.messages.map(({ id }) => id)).toEqual([b.id]))
    expect(
      queryClient.getQueryData(['sent-emails', 'owner', a.id, window.location.hostname]),
    ).toBeDefined()
    expect(
      queryClient.getQueryData(['sent-emails', 'owner', b.id, window.location.hostname]),
    ).toBeDefined()
    expect(readSentWorkspace).not.toHaveBeenCalled()
  })

  it('cancels in-flight pagination and ignores its late A response after switching to B', async () => {
    let release!: (value: ReturnType<typeof page>) => void
    let oldSignal: AbortSignal | undefined
    vi.mocked(fetchSentEmails).mockImplementation(async (_userId, workspaceId, offset, signal) => {
      if (workspaceId === a.id && offset === 20) {
        oldSignal = signal
        return new Promise((resolve) => {
          release = resolve
        })
      }
      return page(workspaceId, workspaceId === a.id ? 20 : null)
    })
    const { result, rerender } = renderHook(() => useSentEmails('owner'), { wrapper })
    await waitFor(() => expect(result.current.messages).toHaveLength(1))
    act(() => {
      void result.current.fetchNextPage()
    })
    await waitFor(() => expect(oldSignal).toBeDefined())
    state = ready(b)
    rerender()
    await waitFor(() => expect(result.current.messages.map(({ id }) => id)).toEqual([b.id]))
    expect(oldSignal?.aborted).toBe(true)
    await act(async () => release(page('late-a')))
    expect(result.current.messages.map(({ id }) => id)).toEqual([b.id])
  })

  it('rejects an identity-mismatched context instead of falling back to another default', async () => {
    const { result } = renderHook(() => useSentEmails('other-user'), { wrapper })
    expect(result.current.messages).toEqual([])
    expect(result.current.isError).toBe(true)
    expect(fetchSentEmails).not.toHaveBeenCalled()
    expect(readSentWorkspace).not.toHaveBeenCalled()
  })

  it('resolves an authoritative default with UI disabled and makes no Sent request until it arrives', async () => {
    state = { ...ready(), status: 'unconfigured', current: null }
    let release!: (value: Workspace) => void
    vi.mocked(readSentWorkspace).mockImplementation(
      () =>
        new Promise((resolve) => {
          release = resolve
        }),
    )
    vi.mocked(fetchSentEmails).mockResolvedValue(page('default-a'))
    const { result } = renderHook(() => useSentEmails('owner'), { wrapper })
    expect(result.current.isPending).toBe(true)
    expect(fetchSentEmails).not.toHaveBeenCalled()
    await act(async () => release(a))
    await waitFor(() => expect(result.current.messages.map(({ id }) => id)).toEqual(['default-a']))
    expect(fetchSentEmails).toHaveBeenCalledWith('owner', a.id, 0, expect.any(AbortSignal))
  })

  it('hides cached A while the default is revalidated and refetches B after a default change', async () => {
    state = null
    vi.mocked(readSentWorkspace).mockResolvedValue(a)
    vi.mocked(fetchSentEmails).mockImplementation(async (_userId, workspaceId) => page(workspaceId))
    const { result } = renderHook(() => useSentEmails('owner'), { wrapper })
    await waitFor(() => expect(result.current.messages.map(({ id }) => id)).toEqual([a.id]))
    let release!: (value: Workspace) => void
    vi.mocked(readSentWorkspace).mockImplementation(
      () =>
        new Promise((resolve) => {
          release = resolve
        }),
    )
    let refreshing!: Promise<void>
    act(() => {
      refreshing = queryClient.invalidateQueries({ queryKey: ['sent-workspace', 'owner'] })
    })
    await waitFor(() => expect(result.current.messages).toEqual([]))
    await act(async () => {
      release(b)
      await refreshing
    })
    await waitFor(() => expect(result.current.messages.map(({ id }) => id)).toEqual([b.id]))
  })

  it.each(['missing', 'ambiguous', 'forbidden'])(
    'does not request Sent when context is %s',
    async (reason) => {
      state = null
      vi.mocked(readSentWorkspace).mockRejectedValue(new Error(reason))
      const { result } = renderHook(() => useSentEmails('owner'), { wrapper })
      await waitFor(() => expect(result.current.isError).toBe(true))
      expect(result.current.isPending).toBe(false)
      expect(result.current.messages).toEqual([])
      expect(fetchSentEmails).not.toHaveBeenCalled()
    },
  )

  it('hides cached data after membership context revalidation is denied', async () => {
    state = null
    vi.mocked(readSentWorkspace).mockResolvedValue(a)
    vi.mocked(fetchSentEmails).mockResolvedValue(page('cached-a'))
    const { result } = renderHook(() => useSentEmails('owner'), { wrapper })
    await waitFor(() => expect(result.current.messages).toHaveLength(1))
    vi.mocked(readSentWorkspace).mockRejectedValue(new Error('Forbidden'))
    await act(async () => queryClient.invalidateQueries({ queryKey: ['sent-workspace', 'owner'] }))
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.messages).toEqual([])
  })

  it('refreshes only the selected query after the existing post-send prefix invalidation', async () => {
    let version = 0
    vi.mocked(fetchSentEmails).mockImplementation(async (_userId, workspaceId) =>
      page(`${workspaceId}-${version}`),
    )
    const { result, rerender } = renderHook(() => useSentEmails('owner'), { wrapper })
    await waitFor(() => expect(result.current.messages).toHaveLength(1))
    state = ready(b)
    rerender()
    await waitFor(() => expect(result.current.messages.map(({ id }) => id)).toEqual([`${b.id}-0`]))
    version = 1
    await act(async () => queryClient.invalidateQueries({ queryKey: ['sent-emails', 'owner'] }))
    await waitFor(() => expect(result.current.messages.map(({ id }) => id)).toEqual([`${b.id}-1`]))
    expect(fetchSentEmails).toHaveBeenLastCalledWith('owner', b.id, 0, expect.any(AbortSignal))
  })
})

it('never reuses another signed-in identity cache even within the same workspace', async () => {
  vi.mocked(fetchSentEmails).mockImplementation(async (userId) => page(`mail-for-${userId}`))
  const { result, rerender } = renderHook(({ userId }) => useSentEmails(userId), {
    wrapper,
    initialProps: { userId: 'owner' },
  })
  await waitFor(() =>
    expect(result.current.messages.map(({ id }) => id)).toEqual(['mail-for-owner']),
  )
  state = ready(a, 'new-owner')
  rerender({ userId: 'new-owner' })
  expect(result.current.messages).toEqual([])
  await waitFor(() =>
    expect(result.current.messages.map(({ id }) => id)).toEqual(['mail-for-new-owner']),
  )
  expect(
    queryClient.getQueryData(['sent-emails', 'owner', a.id, window.location.hostname]),
  ).toBeDefined()
  expect(
    queryClient.getQueryData(['sent-emails', 'new-owner', a.id, window.location.hostname]),
  ).toBeDefined()
})
