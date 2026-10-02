import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  getRouteApi,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { NuqsAdapter } from 'nuqs/adapters/tanstack-router'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mailClient = vi.hoisted(() => ({ fetchMailMessages: vi.fn() }))

vi.mock('../clients/mailMessagesClient', () => mailClient)

import { parseQueryParams, stringifyQueryParams } from '#/config/queryParams'
import { useMailMessages } from '../hooks/useMailMessages'
import { normalizeMailSearch } from '../types/mailSearch'
import { MailboxSearch } from './MailboxSearch'

const mailboxRouteApi = getRouteApi('/_authenticated/_mail')

function NuqsRoot() {
  return (
    <NuqsAdapter>
      <Outlet />
    </NuqsAdapter>
  )
}

function SearchProbe() {
  const { q } = mailboxRouteApi.useSearch()
  return (
    <>
      <MailboxSearch userId="user-1" />
      {q ? <SearchResults q={q} /> : null}
    </>
  )
}

function SearchResults({ q }: { q: string }) {
  const mail = useMailMessages('user-1', q)
  return <p data-testid="search-results">{mail.messages.map(({ id }) => id).join(',')}</p>
}

function createTestRouter({
  component,
  initialEntries = ['/inbox'],
  beforeLoad,
}: {
  component: () => ReactNode
  initialEntries?: string[]
  beforeLoad?: (context: { search: { q?: string } }) => Promise<void> | void
}) {
  const rootRoute = createRootRoute({ component: NuqsRoot })
  const mailRoute = createRoute({
    getParentRoute: () => rootRoute,
    id: '/_authenticated/_mail',
    validateSearch: normalizeMailSearch,
    beforeLoad,
  })
  const inboxRoute = createRoute({
    getParentRoute: () => mailRoute,
    path: '/inbox',
    component,
  })
  return createRouter({
    routeTree: rootRoute.addChildren([mailRoute.addChildren([inboxRoute])]),
    history: createMemoryHistory({ initialEntries }),
    scrollRestoration: false,
    parseSearch: parseQueryParams,
    stringifySearch: stringifyQueryParams,
  })
}

function createQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: 0, gcTime: Infinity } } })
}

describe('MailboxSearch router integration', () => {
  beforeEach(() => vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined))

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    mailClient.fetchMailMessages.mockReset()
  })

  it('starts and shares the first-page request before a delayed route guard resolves', async () => {
    mailClient.fetchMailMessages.mockResolvedValue({
      items: [
        {
          id: 'invoice-result',
          senderName: 'Ada Lovelace',
          subject: 'Invoice',
          body: 'Ready',
          receivedAt: '2026-10-01T12:00:00.000Z',
        },
      ],
      nextCursor: null,
    })
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
    let releaseGuard: (() => void) | undefined
    let guardStarted = false
    const guard = new Promise<void>((resolve) => {
      releaseGuard = resolve
    })
    const router = createTestRouter({
      component: SearchProbe,
      beforeLoad: async ({ search }) => {
        if (search.q === 'invoice') {
          guardStarted = true
          await guard
        }
      },
    })
    const queryClient = createQueryClient()
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )
    const input = await screen.findByRole('searchbox')
    fireEvent.change(input, { target: { value: 'invoice' } })

    await waitFor(() => {
      expect(guardStarted).toBe(true)
      expect(mailClient.fetchMailMessages).toHaveBeenCalledWith(
        expect.objectContaining({ q: 'invoice', cursor: null }),
      )
    })
    expect(screen.queryByTestId('search-results')).toBeNull()

    releaseGuard?.()
    await waitFor(() => expect(router.state.location.search.q).toBe('invoice'))
    expect(await screen.findByTestId('search-results')).toHaveTextContent('invoice-result')
    expect(
      mailClient.fetchMailMessages.mock.calls.filter(([input]) => input.q === 'invoice'),
    ).toHaveLength(1)
  })

  it('keeps newer typing and clearing coherent while an earlier search guard is pending', async () => {
    mailClient.fetchMailMessages.mockResolvedValue({ items: [], nextCursor: null })
    let releaseGuard: (() => void) | undefined
    const guard = new Promise<void>((resolve) => {
      releaseGuard = resolve
    })
    const router = createTestRouter({
      component: SearchProbe,
      beforeLoad: async ({ search }) => {
        if (search.q?.startsWith('invoice')) await guard
      },
    })
    const queryClient = createQueryClient()
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )
    const input = await screen.findByRole('searchbox')

    fireEvent.change(input, { target: { value: 'invoice' } })
    await waitFor(() =>
      expect(mailClient.fetchMailMessages).toHaveBeenCalledWith(
        expect.objectContaining({ q: 'invoice', cursor: null }),
      ),
    )
    fireEvent.change(input, { target: { value: 'invoice 2' } })
    await waitFor(() =>
      expect(mailClient.fetchMailMessages).toHaveBeenCalledWith(
        expect.objectContaining({ q: 'invoice 2', cursor: null }),
      ),
    )
    fireEvent.change(input, { target: { value: '' } })
    await waitFor(() => {
      expect(router.state.location.search.q).toBeUndefined()
      expect(input).toHaveValue('')
    })

    releaseGuard?.()
    await waitFor(() => expect(router.state.location.search.q).toBeUndefined())
    expect(input).toHaveValue('')
  })

  it('keeps URL updates on Inbox and restores the input after external query navigation', async () => {
    mailClient.fetchMailMessages.mockResolvedValue({ items: [], nextCursor: null })
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
    const router = createTestRouter({
      component: () => <MailboxSearch userId="user-1" />,
      initialEntries: ['/inbox?q=invoice'],
    })
    render(
      <QueryClientProvider client={createQueryClient()}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )
    const input = await screen.findByRole('searchbox')
    expect(input).toHaveValue('invoice')
    fireEvent.change(input, { target: { value: 'local draft' } })

    await router.navigate({ to: '/inbox', search: { q: 'other' }, replace: true })
    await waitFor(() => expect(input).toHaveValue('other'))
    await router.navigate({ to: '/inbox', search: { q: 'invoice' }, replace: true })
    await waitFor(() => expect(input).toHaveValue('invoice'))
    expect(router.state.location.pathname).toBe('/inbox')
  })

  it.each(['123', 'false'])(
    'preserves literal query text %s through Router and Nuqs',
    async (term) => {
      mailClient.fetchMailMessages.mockResolvedValue({ items: [], nextCursor: null })
      vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
      const router = createTestRouter({
        component: () => <MailboxSearch userId="user-1" />,
      })
      render(
        <QueryClientProvider client={createQueryClient()}>
          <RouterProvider router={router} />
        </QueryClientProvider>,
      )
      const input = await screen.findByRole('searchbox')
      fireEvent.change(input, { target: { value: term } })

      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/inbox')
        expect(router.state.location.search.q).toBe(term)
        expect(input).toHaveValue(term)
      })
    },
  )
})
