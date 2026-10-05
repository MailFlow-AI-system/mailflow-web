import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { WorkspaceState } from '../types'
import { WorkspaceSelector } from './WorkspaceSelector'

const current = { id: 'a', name: 'Acme Corp', slug: 'acme', role: 'owner' as const }
function state(status: WorkspaceState['status'] = 'ready'): WorkspaceState {
  return {
    status,
    current,
    items: [current, { id: 'b', name: 'Northwind', slug: 'northwind', role: 'member' }],
    retry: vi.fn(),
    loadMore: vi.fn(),
    hasMore: false,
    loadingMore: false,
    pageError: false,
  }
}
describe('workspace selector presentation', () => {
  afterEach(cleanup)
  it('lists authorized workspaces and highlights current without local optimistic selection', async () => {
    const user = userEvent.setup()
    render(<WorkspaceSelector state={state()} />)
    const trigger = screen.getByRole('combobox', { name: 'Workspace: Acme Corp' })
    await user.click(trigger)
    expect(await screen.findByRole('option', { name: 'Acme Corp' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('option', { name: 'Northwind' })).toBeVisible()
    expect(screen.queryByRole('option', { name: 'Globex' })).toBeNull()
    await user.keyboard('{Escape}')
    expect(trigger).toHaveFocus()
  })
  it('shows explicit error/retry instead of falling back to Acme', async () => {
    const error = { ...state('error'), current: null, items: [] }
    render(<WorkspaceSelector state={error} />)
    expect(
      screen.getByRole('combobox', { name: 'Workspace: Workspace unavailable' }),
    ).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(error.retry).toHaveBeenCalledOnce()
    expect(screen.queryByText('Acme Corp')).toBeNull()
  })
})
