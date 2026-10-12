import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useWorkspaceContext } from '#/features/workspaces/hooks/useWorkspaceContext'
import type { WorkspaceState } from '#/features/workspaces/types'
import { WorkspaceSwitcher } from './WorkspaceSwitcher'

const { request } = vi.hoisted(() => ({ request: vi.fn() }))
vi.mock('#/config/env', () => ({
  clientEnvironment: {
    workspaceSwitchingEnabled: true,
    VITE_WORKSPACE_BASE_HOST: 'workspace.test',
  },
}))
vi.mock('#/features/workspaces/hooks/useWorkspaceContext', () => ({ useWorkspaceContext: vi.fn() }))
vi.mock('#/features/workspaces/hooks/useWorkspaceSelection', () => ({
  useWorkspaceSelection: () => ({
    request,
    busy: false,
    error: null,
  }),
}))

const acme = { id: 'a', name: 'Acme Corp', slug: 'acme', role: 'owner' as const }
const northwind = { id: 'b', name: 'Northwind', slug: 'northwind', role: 'member' as const }
const state: WorkspaceState = {
  identityId: 'actor',
  status: 'ready',
  current: acme,
  items: [acme, northwind],
  retry: vi.fn(),
  loadMore: vi.fn(),
  hasMore: false,
  loadingMore: false,
  pageError: false,
}

describe('WorkspaceSwitcher', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('keeps server-authorized selection and the DS avatar when requesting another workspace', async () => {
    vi.mocked(useWorkspaceContext).mockReturnValue(state)
    const user = userEvent.setup()
    const { rerender } = render(<WorkspaceSwitcher />)
    const trigger = screen.getByRole('combobox', { name: 'Workspace: Acme Corp' })
    expect(trigger.querySelector('[data-slot="avatar"]')).not.toBeNull()
    await user.click(trigger)
    await user.click(await screen.findByRole('option', { name: /Northwind/ }))
    expect(request).toHaveBeenCalledWith('b')
    expect(trigger).toHaveTextContent('Acme Corp')
    vi.mocked(useWorkspaceContext).mockReturnValue({ ...state, current: northwind })
    rerender(<WorkspaceSwitcher />)
    expect(screen.getByRole('combobox', { name: 'Workspace: Northwind' })).toHaveTextContent(
      'Northwind',
    )
    expect(screen.queryByRole('option', { name: /Acme Corp/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('does not create mock memberships when the provider is absent', () => {
    vi.mocked(useWorkspaceContext).mockReturnValue(null)
    render(<WorkspaceSwitcher />)
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.queryByText('Acme Corp')).not.toBeInTheDocument()
  })
})
