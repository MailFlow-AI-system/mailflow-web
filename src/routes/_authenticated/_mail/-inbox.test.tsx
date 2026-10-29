import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const routerState = vi.hoisted(() => ({
  baseHost: undefined as string | undefined,
  workspaceSlug: 'acme' as string | undefined,
  committedQ: 'invoice' as string | undefined,
  queryQ: 'invoice' as string | undefined,
}))
vi.mock('#/config/env', () => ({
  clientEnvironment: {
    get VITE_WORKSPACE_BASE_HOST() {
      return routerState.baseHost
    },
  },
}))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute:
    () =>
    (options: { component?: () => ReactNode; head?: () => { meta: { title: string }[] } }) => ({
      options,
    }),
  getRouteApi: (routeId: string) =>
    routeId === '/_authenticated'
      ? { useRouteContext: () => ({ user: { id: 'user-1' } }) }
      : { useSearch: () => ({ q: routerState.committedQ }) },
}))
vi.mock('nuqs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('nuqs')>()),
  useQueryState: () => [routerState.queryQ ?? '', vi.fn()],
}))

vi.mock('#/features/mail-list/components/MailList', async () => {
  const { useMailSelection } = await import('#/features/mail-selection/hooks/useMailSelection')
  return {
    MailList: ({
      userId,
      q,
      isSearching,
      heading,
    }: {
      userId: string
      q: string
      isSearching?: boolean
      heading?: string
    }) => {
      const selection = useMailSelection()
      return (
        <div
          data-testid="mail-list"
          data-heading={heading}
          data-q={q}
          data-searching={isSearching}
          data-selection-count={selection?.count}
          data-user-id={userId}
        >
          <button onClick={() => selection?.setSelected('message-1', true)} type="button">
            select message
          </button>
        </div>
      )
    },
  }
})

vi.mock('#/features/workspaces/hooks/useWorkspaceContext', () => ({
  useWorkspaceContext: () => ({
    current: routerState.workspaceSlug ? { slug: routerState.workspaceSlug } : null,
  }),
}))

import { inboxHead, Route } from './inbox'

const InboxPage = Route.options.component
if (!InboxPage) throw new Error('Inbox route has no component')

describe('Inbox route', () => {
  afterEach(() => {
    cleanup()
    routerState.baseHost = undefined
    routerState.workspaceSlug = 'acme'
  })

  it('does not mount mail without an authorized workspace', () => {
    routerState.workspaceSlug = undefined
    render(<InboxPage />)
    expect(screen.queryByTestId('mail-list')).toBeNull()
    expect(screen.getByText('Open a workspace address')).toBeVisible()
  })

  it('hands the Inbox title row to the list and sets the document title', () => {
    routerState.committedQ = 'invoice'
    routerState.queryQ = 'invoice'
    render(<InboxPage />)

    // The list owns the title row so it can turn into the selection bar.
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Inbox' })).toBeInTheDocument()
    expect(screen.getByTestId('mail-list')).toHaveAttribute('data-heading', 'Inbox')
    expect(screen.getByTestId('mail-list')).toHaveAttribute('data-q', 'invoice')
    expect(screen.getByTestId('mail-list')).toHaveAttribute('data-user-id', 'user-1')
    expect(Route.options.head).toBe(inboxHead)
    expect(inboxHead().meta).toContainEqual({ title: 'Inbox' })
  })

  it('keeps the list mounted while a new route search is pending and after it commits', () => {
    routerState.committedQ = 'invoice'
    routerState.queryQ = 'filtered'
    const view = render(<InboxPage />)
    const list = screen.getByTestId('mail-list')

    expect(list).toHaveAttribute('data-searching', 'true')
    expect(list).toHaveAttribute('data-q', 'filtered')

    routerState.committedQ = 'filtered'
    routerState.queryQ = 'filtered'
    view.rerender(<InboxPage />)

    expect(screen.getByTestId('mail-list')).toBe(list)
    expect(list).toHaveAttribute('data-searching', 'false')
    expect(list).toHaveAttribute('data-q', 'filtered')
  })
  it('provides message selection to the list and starts with nothing selected', () => {
    render(<InboxPage />)

    expect(screen.getByTestId('mail-list')).toHaveAttribute('data-selection-count', '0')
    fireEvent.click(screen.getByRole('button', { name: 'select message' }))
    expect(screen.getByTestId('mail-list')).toHaveAttribute('data-selection-count', '1')
  })

  it('resets the selection when the workspace changes', () => {
    const view = render(<InboxPage />)
    fireEvent.click(screen.getByRole('button', { name: 'select message' }))
    expect(screen.getByTestId('mail-list')).toHaveAttribute('data-selection-count', '1')

    routerState.workspaceSlug = 'globex'
    view.rerender(<InboxPage />)

    expect(screen.getByTestId('mail-list')).toHaveAttribute('data-selection-count', '0')
  })
})
