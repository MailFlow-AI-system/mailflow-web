import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readWorkspaceResponse } from '#/features/workspaces/clients/workspaceAuthority'
import type { WorkspaceState } from '#/features/workspaces/types'
import { useMailDetail } from './useMailDetail'

let state: WorkspaceState
vi.mock('#/features/workspaces/hooks/useWorkspaceContext', () => ({
  useWorkspaceContext: () => state,
}))
vi.mock('#/features/workspaces/hooks/useWorkspaceIdentityRecovery', () => ({
  useWorkspaceIdentityRecovery: vi.fn(),
}))
vi.mock('#/features/workspaces/clients/workspaceAuthority', async (original) => ({
  ...(await original<object>()),
  readWorkspaceResponse: vi.fn(),
}))
vi.mock('#/features/mail-list/clients/sentEmailsClient', () => ({ readSentWorkspace: vi.fn() }))
vi.mock('#/config/env', () => ({ clientEnvironment: { VITE_API_BASE_URL: 'https://api.test' } }))
const detail = (subject: string) => ({
  id: 'one',
  subject,
  senderName: null,
  senderEmail: 'ada@example.test',
  to: [],
  cc: [],
  bcc: [],
  html: null,
  text: '',
  date: '2026-10-29T12:00:00Z',
  attachments: [],
})
let client: QueryClient
const ready = (id: string, identityId = 'owner'): WorkspaceState => ({
  identityId,
  status: 'ready',
  current: { id, slug: id, name: id, role: 'owner' },
  items: [],
  retry: vi.fn(),
  loadMore: vi.fn(),
  hasMore: false,
  loadingMore: false,
  pageError: false,
})
function wrapper({ children }: PropsWithChildren) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  state = ready('workspace-a')
})
afterEach(async () => {
  cleanup()
  await client.cancelQueries()
  client.clear()
  vi.resetAllMocks()
})

describe('detail workspace authority', () => {
  it('fetches the selected folder and pins both identity and workspace', async () => {
    vi.mocked(readWorkspaceResponse).mockResolvedValue(detail('Sent message'))
    const { result } = renderHook(() => useMailDetail('owner', 'sent', 'one'), { wrapper })
    await waitFor(() => expect(result.current.data?.subject).toBe('Sent message'))
    expect(readWorkspaceResponse).toHaveBeenCalledWith(
      '/api/mail/sent/one',
      'owner',
      expect.any(AbortSignal),
      { headers: { Accept: 'application/json', 'X-Workspace-Id': 'workspace-a' } },
      'workspace-a',
    )
  })
  it('never flashes the old workspace body while the next workspace detail is pending', async () => {
    let release!: (value: ReturnType<typeof detail>) => void
    vi.mocked(readWorkspaceResponse)
      .mockResolvedValueOnce(detail('Private A'))
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            release = resolve
          }),
      )
    const { result, rerender } = renderHook(() => useMailDetail('owner', 'messages', 'one'), {
      wrapper,
    })
    await waitFor(() => expect(result.current.data?.subject).toBe('Private A'))
    state = ready('workspace-b')
    rerender()
    expect(result.current.data).toBeUndefined()
    await waitFor(() => expect(release).toBeDefined())
    await act(async () => release(detail('Private B')))
    expect(result.current.data?.subject).not.toBe('Private A')
    await waitFor(() => expect(result.current.data?.subject).toBe('Private B'))
  })
  it('hides cached detail immediately when the authenticated account changes', async () => {
    vi.mocked(readWorkspaceResponse).mockResolvedValue(detail('Private A'))
    const { result, rerender } = renderHook(() => useMailDetail('owner', 'messages', 'one'), {
      wrapper,
    })
    await waitFor(() => expect(result.current.data).toBeDefined())
    state = ready('workspace-a', 'other-account')
    rerender()
    expect(result.current.data).toBeUndefined()
    expect(result.current.isError).toBe(true)
    expect(readWorkspaceResponse).toHaveBeenCalledOnce()
  })
})
