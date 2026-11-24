import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { WorkspaceEntryBoundary } from './WorkspaceEntryBoundary'

afterEach(cleanup)
describe('workspace entry boundary', () => {
  it('explains a missing membership without mounting the composer or content', () => {
    render(
      <WorkspaceEntryBoundary kind="forbidden" retry={() => {}}>
        <button type="button">Compose</button>
      </WorkspaceEntryBoundary>,
    )
    expect(screen.getByRole('heading', { name: 'No access to this workspace' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Compose' })).not.toBeInTheDocument()
  })
  it('offers a retry only for operational failures without mounting tenant content', () => {
    const retry = vi.fn()
    render(
      <WorkspaceEntryBoundary kind="error" retry={retry}>
        <span>private</span>
      </WorkspaceEntryBoundary>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(retry).toHaveBeenCalledOnce()
    expect(screen.queryByText('private')).not.toBeInTheDocument()
  })
  it('preserves existing layout on an explicit or unconfigured host', () => {
    render(
      <WorkspaceEntryBoundary kind="passthrough" retry={() => {}}>
        <span>existing layout</span>
      </WorkspaceEntryBoundary>,
    )
    expect(screen.getByText('existing layout')).toBeVisible()
  })
  it('offers an account action without requiring any tenant content', () => {
    render(
      <WorkspaceEntryBoundary
        kind="forbidden"
        retry={() => {}}
        accountAction={<button type="button">Sign out</button>}
      >
        <span>tenant</span>
      </WorkspaceEntryBoundary>,
    )
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeVisible()
    expect(screen.queryByText('tenant')).not.toBeInTheDocument()
  })
})
