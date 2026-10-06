import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { selectWorkspace } from '../clients/workspaceClient'
import { WorkspaceRateLimitedError } from '../clients/workspaceRateLimitedError'
import type { WorkspaceSelectionOptions } from '../types/selection'
import { useWorkspaceSelection } from './useWorkspaceSelection'

vi.mock('../clients/workspaceClient', () => ({ selectWorkspace: vi.fn() }))
vi.mock('../clients/workspaceAuthority', () => ({
  WorkspaceIdentityChangedError: class extends Error {},
}))
vi.mock('./useWorkspaceIdentityRecovery', () => ({ useWorkspaceIdentityRecovery: vi.fn() }))
vi.mock('../utils/workspaceNavigation', () => ({ workspaceDestination: vi.fn(() => '/inbox') }))

describe('workspace selection rate-limit recovery', () => {
  afterEach(() => vi.resetAllMocks())

  it('reports the wait, preserves the draft and releases pending navigation', async () => {
    vi.mocked(selectWorkspace).mockRejectedValueOnce(new WorkspaceRateLimitedError(37))
    const discard = vi.fn()
    const pending = vi.fn()
    const options: WorkspaceSelectionOptions = {
      enabled: true,
      baseHost: 'workspace.test',
      composer: {
        theme: 'dark',
        hasLocalDraft: () => true,
        discard,
        setNavigationPending: pending,
      },
      state: {
        identityId: 'actor',
        status: 'ready',
        current: { id: 'a', name: 'Acme', slug: 'acme', role: 'owner' },
        items: [{ id: 'b', name: 'Northwind', slug: 'northwind', role: 'member' }],
        retry: vi.fn(),
        loadMore: vi.fn(),
        hasMore: false,
        loadingMore: false,
        pageError: false,
      },
    }
    const { result } = renderHook(() => useWorkspaceSelection(options))
    act(() => result.current.request('b'))
    expect(selectWorkspace).not.toHaveBeenCalled()
    act(() => result.current.confirm())
    await waitFor(() => expect(result.current.error).toContain('Try again in 37 seconds.'))
    expect(result.current.error).toContain('Your message has been preserved.')
    expect(result.current.retryAfterSeconds).toBe(37)
    expect(result.current.busy).toBe(false)
    expect(discard).not.toHaveBeenCalled()
    expect(pending.mock.calls).toEqual([[true], [false]])
  })
})
