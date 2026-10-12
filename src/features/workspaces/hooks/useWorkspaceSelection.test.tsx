import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WorkspaceIdentityChangedError } from '../clients/workspaceAuthority'
import { selectWorkspace } from '../clients/workspaceClient'
import { WorkspaceRateLimitedError } from '../clients/workspaceRateLimitedError'
import type { WorkspaceSelectionOptions } from '../types/selection'
import { workspaceDestination } from '../utils/workspaceNavigation'
import { useWorkspaceIdentityRecovery } from './useWorkspaceIdentityRecovery'
import { useWorkspaceSelection } from './useWorkspaceSelection'

vi.mock('../clients/workspaceClient', () => ({ selectWorkspace: vi.fn() }))
vi.mock('../clients/workspaceAuthority', () => ({
  WorkspaceIdentityChangedError: class extends Error {},
}))
vi.mock('./useWorkspaceIdentityRecovery', () => ({ useWorkspaceIdentityRecovery: vi.fn() }))
vi.mock('../utils/workspaceNavigation', () => ({ workspaceDestination: vi.fn() }))

const options: WorkspaceSelectionOptions = {
  enabled: true,
  baseHost: 'workspace.test',
  state: {
    identityId: 'actor',
    status: 'ready',
    current: { id: 'a', name: 'Acme', slug: 'acme', role: 'owner' },
    items: [
      { id: 'a', name: 'Acme', slug: 'acme', role: 'owner' },
      { id: 'b', name: 'Northwind', slug: 'northwind', role: 'member' },
    ],
    retry: vi.fn(),
    loadMore: vi.fn(),
    hasMore: false,
    loadingMore: false,
    pageError: false,
  },
}

describe('workspace selection', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(workspaceDestination).mockReturnValue('/inbox')
  })
  afterEach(cleanup)

  it('requests selection directly and reports a rate limit without automatic retries', async () => {
    vi.mocked(selectWorkspace).mockRejectedValueOnce(new WorkspaceRateLimitedError(37))
    const { result } = renderHook(() => useWorkspaceSelection(options))
    act(() => result.current.request('b'))
    expect(selectWorkspace).toHaveBeenCalledWith('b', 'actor', expect.any(AbortSignal))
    await waitFor(() =>
      expect(result.current.error).toBe('Too many workspace requests. Try again in 37 seconds.'),
    )
    expect(result.current.retryAfterSeconds).toBe(37)
    expect(result.current.busy).toBe(false)
    expect(selectWorkspace).toHaveBeenCalledTimes(1)
  })

  it('allows an explicit retry after a failed selection', async () => {
    vi.mocked(selectWorkspace).mockRejectedValue(new Error('Unavailable'))
    const { result } = renderHook(() => useWorkspaceSelection(options))
    act(() => result.current.request('b'))
    await waitFor(() =>
      expect(result.current.error).toBe('Workspace could not be changed. Try again.'),
    )
    expect(result.current.busy).toBe(false)
    act(() => result.current.request('b'))
    await waitFor(() => expect(selectWorkspace).toHaveBeenCalledTimes(2))
  })

  it('ignores the current workspace and unknown or empty selections', () => {
    const { result } = renderHook(() => useWorkspaceSelection(options))
    act(() => {
      result.current.request('a')
      result.current.request('unknown')
      result.current.request(null)
    })
    expect(selectWorkspace).not.toHaveBeenCalled()
  })

  it('does not select when switching is disabled', () => {
    const { result } = renderHook(() => useWorkspaceSelection({ ...options, enabled: false }))
    act(() => result.current.request('b'))
    expect(selectWorkspace).not.toHaveBeenCalled()
  })

  it('blocks duplicate requests and aborts pending selection on unmount', () => {
    vi.mocked(selectWorkspace).mockImplementation(() => new Promise(() => {}))
    const { result, unmount } = renderHook(() => useWorkspaceSelection(options))
    act(() => {
      result.current.request('b')
      result.current.request('b')
    })
    expect(result.current.busy).toBe(true)
    expect(selectWorkspace).toHaveBeenCalledTimes(1)
    const signal = vi.mocked(selectWorkspace).mock.calls[0]?.[2]
    expect(signal?.aborted).toBe(false)
    unmount()
    expect(signal?.aborted).toBe(true)
  })

  it('recovers the authenticated identity when it changes during selection', async () => {
    const failure = new WorkspaceIdentityChangedError()
    vi.mocked(selectWorkspace).mockRejectedValueOnce(failure)
    const { result } = renderHook(() => useWorkspaceSelection(options))
    act(() => result.current.request('b'))
    await waitFor(() =>
      expect(result.current.error).toBe('Your session changed. Reopening this workspace safely.'),
    )
    expect(useWorkspaceIdentityRecovery).toHaveBeenLastCalledWith(failure)
  })
})
