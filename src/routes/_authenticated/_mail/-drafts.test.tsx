import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ openDraft: vi.fn(async () => {}) }))
vi.mock('#/config/env', () => ({ clientEnvironment: {} }))
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: { component: () => ReactNode }) => ({ options }),
  getRouteApi: () => ({
    useRouteContext: () => ({ user: { id: 'owner' } }),
    useSearch: () => ({}),
  }),
}))
vi.mock('nuqs', async (original) => ({
  ...(await original<object>()),
  useQueryState: () => ['', vi.fn()],
}))
vi.mock('#/features/workspaces/hooks/useWorkspaceContext', () => ({
  useWorkspaceContext: () => ({ current: { id: 'workspace-a', slug: 'acme' } }),
}))
vi.mock('#/features/email-composer', () => ({
  useComposer: () => ({ openDraft: state.openDraft }),
}))
vi.mock('#/features/email-drafts/DraftMailList', () => ({
  DraftMailList: ({ heading, onSelect }: { heading?: string; onSelect: (id: string) => void }) => (
    <div data-testid="draft-list">
      {heading ? <h1 className="px-3 py-3 text-sm font-semibold">{heading}</h1> : null}
      <button type="button" onClick={() => onSelect('draft-1')}>
        pick draft
      </button>
    </div>
  ),
}))

import { Route as DraftsRoute } from './drafts'

const Drafts = DraftsRoute.options.component
if (!Drafts) throw new Error('Drafts route must have a component')

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('Drafts page', () => {
  it('lets the list use the whole page, with no reading pane beside it', () => {
    render(<Drafts />)
    const panel = screen.getByRole('region', { name: 'Drafts' })
    expect(panel).toHaveClass('w-full')
    expect(panel).not.toHaveClass('lg:w-[380px]')
    expect(panel.nextElementSibling).toBeNull()
    expect(screen.getByRole('heading', { name: 'Drafts', level: 1 })).toHaveClass(
      'text-sm',
      'font-semibold',
    )
  })

  it('continues the chosen draft in the Composer', async () => {
    render(<Drafts />)
    await userEvent.click(screen.getByRole('button', { name: 'pick draft' }))
    expect(state.openDraft).toHaveBeenCalledWith('draft-1')
  })
})
