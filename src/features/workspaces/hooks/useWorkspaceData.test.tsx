import { dehydrate, hydrate, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { readWorkspaceContext, readWorkspacePage } from '../clients/workspaceClient'
import type { Workspace, WorkspaceContextResponse } from '../types'
import { useWorkspaceData } from './useWorkspaceData'

vi.mock('../clients/workspaceClient', () => ({
  readWorkspaceContext: vi.fn(),
  readWorkspacePage: vi.fn(),
}))
vi.mock('./useWorkspaceIdentityRecovery', () => ({ useWorkspaceIdentityRecovery: vi.fn() }))
vi.mock('../../auth/adapters/getCurrentSession', () => ({ getCurrentSession: vi.fn() }))

const acme: Workspace = { id: 'a', name: 'Acme', slug: 'acme', role: 'owner' }
const northwind: Workspace = { id: 'b', name: 'Northwind', slug: 'northwind', role: 'owner' }

function wrapper(client: QueryClient) {
  return function QueryWrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

describe('workspace query scope and revalidation', () => {
  afterEach(() => {
    cleanup()
    vi.resetAllMocks()
  })

  it('does not render hydrated cache belonging to another identity or host', async () => {
    const seed = new QueryClient()
    seed.setQueryData(['workspaces', 'old', window.location.hostname, 'context'], {
      workspace: acme,
    })
    seed.setQueryData(['workspaces', 'new', 'foreign.workspace.test', 'context'], {
      workspace: acme,
    })
    seed.setQueryData(['workspaces', 'old', window.location.hostname, 'list'], {
      pages: [{ items: [acme], nextCursor: null }],
      pageParams: [null],
    })
    const client = new QueryClient()
    hydrate(client, dehydrate(seed))
    let release: (data: WorkspaceContextResponse) => void = () => {}
    vi.mocked(readWorkspaceContext).mockReturnValue(
      new Promise((resolve) => {
        release = resolve
      }),
    )
    vi.mocked(readWorkspacePage).mockResolvedValue({ items: [northwind], nextCursor: null })
    const { result } = renderHook(() => useWorkspaceData('new', true), { wrapper: wrapper(client) })
    expect(result.current.current).toBeNull()
    expect(result.current.items).not.toContainEqual(acme)
    await act(async () => release({ workspace: northwind }))
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.current).toEqual(northwind)
    expect(result.current.items).toEqual([northwind])
    seed.clear()
    client.clear()
  })

  it('hides cached workspace names after context revalidation is denied', async () => {
    const client = new QueryClient()
    vi.mocked(readWorkspaceContext).mockResolvedValue({ workspace: acme })
    vi.mocked(readWorkspacePage).mockResolvedValue({ items: [acme], nextCursor: null })
    const { result } = renderHook(() => useWorkspaceData('actor', true), {
      wrapper: wrapper(client),
    })
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.current).toEqual(acme)
    vi.mocked(readWorkspaceContext).mockRejectedValue(new Error('Access denied'))
    act(() => result.current.retry())
    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.current).toBeNull()
    expect(result.current.items).toEqual([])
    client.clear()
  })

  it('cancels the old scope and ignores its delayed response after identity changes', async () => {
    const client = new QueryClient()
    let release: (data: WorkspaceContextResponse) => void = () => {}
    let oldSignal: AbortSignal | undefined
    const delayed = new Promise<WorkspaceContextResponse>((resolve) => {
      release = resolve
    })
    vi.mocked(readWorkspaceContext).mockImplementation((id, signal) => {
      if (id === 'old') {
        oldSignal = signal
        return delayed
      }
      return Promise.resolve({ workspace: northwind })
    })
    vi.mocked(readWorkspacePage).mockImplementation(async (id) => ({
      items: [id === 'old' ? acme : northwind],
      nextCursor: null,
    }))
    const { result, rerender } = renderHook(({ userId }) => useWorkspaceData(userId, true), {
      wrapper: wrapper(client),
      initialProps: { userId: 'old' },
    })
    await waitFor(() => expect(oldSignal).toBeDefined())
    rerender({ userId: 'new' })
    await waitFor(() => expect(result.current.current).toEqual(northwind))
    expect(oldSignal?.aborted).toBe(true)
    await act(async () => release({ workspace: acme }))
    expect(result.current.current).toEqual(northwind)
    expect(result.current.items).toEqual([northwind])
    expect(
      client.getQueryData(['workspaces', 'old', window.location.hostname, 'context']),
    ).toBeUndefined()
    client.clear()
  })
})
