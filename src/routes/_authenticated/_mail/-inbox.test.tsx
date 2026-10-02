import { cleanup, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const routerState = vi.hoisted(() => ({
  committedQ: 'invoice' as string | undefined,
  queryQ: 'invoice' as string | undefined,
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

vi.mock('#/features/mail-list/components/MailList', () => ({
  MailList: ({ userId, q, isSearching }: { userId: string; q: string; isSearching?: boolean }) => (
    <div data-testid="mail-list" data-q={q} data-searching={isSearching} data-user-id={userId} />
  ),
}))

import { inboxHead, Route } from './inbox'

const InboxPage = Route.options.component
if (!InboxPage) throw new Error('Inbox route has no component')

describe('Inbox route', () => {
  afterEach(cleanup)

  it('shows the Inbox heading and sets the document title', () => {
    routerState.committedQ = 'invoice'
    routerState.queryQ = 'invoice'
    render(<InboxPage />)

    expect(screen.getByRole('heading', { level: 1, name: 'Inbox' })).toBeInTheDocument()
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
})
