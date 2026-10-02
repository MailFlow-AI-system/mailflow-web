import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const client = vi.hoisted(() => ({ fetchMailMessages: vi.fn() }))

vi.mock('../clients/mailMessagesClient', () => client)

let activeQueryClient: QueryClient

import { MailList } from './MailList'

const message = (id: string) => ({
  id,
  senderName: 'Ada Lovelace',
  subject: `Message ${id}`,
  body: `Body ${id}`,
  receivedAt: '2026-10-01T12:00:00.000Z',
})

class VisibleIntersectionObserver {
  static instances: VisibleIntersectionObserver[] = []
  static visible = true
  callback: IntersectionObserverCallback
  target: Element | null = null

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
    VisibleIntersectionObserver.instances.push(this)
  }

  observe(target: Element) {
    this.target = target
    this.notify()
  }

  disconnect() {}

  notify() {
    if (!this.target) return
    const entry = {
      isIntersecting: VisibleIntersectionObserver.visible,
      target: this.target,
    } as IntersectionObserverEntry
    this.callback([entry], this as unknown as IntersectionObserver)
  }
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: 0, gcTime: Infinity } },
  })
  activeQueryClient = queryClient

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('MailList', () => {
  beforeEach(() => {
    client.fetchMailMessages.mockReset()
    VisibleIntersectionObserver.instances = []
    VisibleIntersectionObserver.visible = true
    vi.stubGlobal('IntersectionObserver', VisibleIntersectionObserver)
  })

  afterEach(() => {
    cleanup()
    activeQueryClient?.clear()
    vi.unstubAllGlobals()
  })

  it('keeps a busy scroll region with eight card skeletons during initial loading', () => {
    client.fetchMailMessages.mockImplementation(() => new Promise(() => {}))
    render(<MailList userId="user-1" q="" />, { wrapper: createWrapper() })

    expect(screen.getByRole('region', { name: 'Inbox message list' })).toHaveAttribute(
      'aria-busy',
      'true',
    )
    expect(screen.getAllByTestId('mail-message-skeleton')).toHaveLength(8)
    expect(screen.queryByText('No messages found.')).not.toBeInTheDocument()
  })

  it('shows skeletons while retrying a failed search without existing messages', async () => {
    let resolveRetry:
      | ((page: { items: ReturnType<typeof message>[]; nextCursor: null }) => void)
      | undefined
    client.fetchMailMessages
      .mockRejectedValueOnce(new Error('Unavailable'))
      .mockRejectedValueOnce(new Error('Unavailable'))
      .mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveRetry = resolve
          }),
      )
    const Wrapper = createWrapper()
    activeQueryClient.setQueryDefaults(['mail-messages-page'], { retryDelay: 0 })
    render(<MailList userId="user-1" q="filtered" />, { wrapper: Wrapper })
    await screen.findByRole('alert')
    const region = screen.getByRole('region', { name: 'Inbox message list' })

    fireEvent.click(screen.getByRole('button', { name: 'Retry loading messages' }))
    await waitFor(() => expect(screen.getAllByTestId('mail-message-skeleton')).toHaveLength(8))
    expect(screen.queryByRole('button', { name: 'Retry loading messages' })).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Inbox message list' })).toBe(region)
    expect(region).toHaveAttribute('aria-busy', 'true')

    await act(async () => resolveRetry?.({ items: [message('recovered')], nextCursor: null }))
    expect(await screen.findByText('Message recovered')).toBeInTheDocument()
    expect(screen.queryByTestId('mail-message-skeleton')).not.toBeInTheDocument()
  })

  it('preserves the scroll region and resets its position when the filter changes', async () => {
    client.fetchMailMessages.mockImplementation(({ q }: { q: string }) =>
      q ? new Promise(() => {}) : Promise.resolve({ items: [message('first')], nextCursor: null }),
    )
    const view = render(<MailList userId="user-1" q="" />, { wrapper: createWrapper() })
    await screen.findByText('Message first')
    const region = screen.getByRole('region', { name: 'Inbox message list' })
    region.scrollTop = 120

    view.rerender(<MailList userId="user-1" q="filtered" />)

    expect(screen.getByRole('region', { name: 'Inbox message list' })).toBe(region)
    expect(region.scrollTop).toBe(0)
    expect(screen.getAllByTestId('mail-message-skeleton')).toHaveLength(8)
    expect(screen.queryByText('Message first')).not.toBeInTheDocument()
  })

  it('shows search skeletons while route validation is pending without advancing old pages', async () => {
    VisibleIntersectionObserver.visible = false
    client.fetchMailMessages.mockImplementation(({ cursor }: { cursor?: string }) =>
      Promise.resolve({
        items: [message(cursor ? 'second' : 'first')],
        nextCursor: cursor ? null : 'cursor-2',
      }),
    )
    const view = render(<MailList userId="user-1" q="" />, { wrapper: createWrapper() })
    await screen.findByText('Message first')
    await waitFor(() => expect(client.fetchMailMessages).toHaveBeenCalledTimes(2))
    const region = screen.getByRole('region', { name: 'Inbox message list' })

    view.rerender(<MailList userId="user-1" q="" isSearching />)

    expect(screen.getByRole('region', { name: 'Inbox message list' })).toBe(region)
    expect(region).toHaveAttribute('aria-busy', 'true')
    expect(screen.getAllByTestId('mail-message-skeleton')).toHaveLength(8)
    expect(screen.queryByText('Message first')).not.toBeInTheDocument()
    await act(async () => {
      VisibleIntersectionObserver.visible = true
      for (const observer of VisibleIntersectionObserver.instances) observer.notify()
    })
    expect(
      activeQueryClient.getQueryData<{ pages: unknown[] }>(['mail-messages', 'user-1', ''])?.pages,
    ).toHaveLength(1)
    expect(client.fetchMailMessages).toHaveBeenCalledTimes(2)
  })

  it('appends skeletons while consuming a pending next page and keeps existing cards', async () => {
    client.fetchMailMessages.mockImplementation(({ cursor }: { cursor?: string }) =>
      cursor
        ? new Promise(() => {})
        : Promise.resolve({ items: [message('first')], nextCursor: 'cursor-2' }),
    )
    render(<MailList userId="user-1" q="" />, { wrapper: createWrapper() })
    await screen.findByText('Message first')

    await waitFor(() => expect(screen.getAllByTestId('mail-message-skeleton')).toHaveLength(8))
    expect(screen.getByText('Message first')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Inbox message list' })).toHaveAttribute(
      'aria-busy',
      'true',
    )
    expect(
      client.fetchMailMessages.mock.calls.filter(([input]) => input.cursor === 'cursor-2'),
    ).toHaveLength(1)
  })

  it('does not show skeletons for a next-page prefetch that has not been requested for display', async () => {
    VisibleIntersectionObserver.visible = false
    client.fetchMailMessages.mockImplementation(({ cursor }: { cursor?: string }) =>
      cursor
        ? new Promise(() => {})
        : Promise.resolve({ items: [message('first')], nextCursor: 'cursor-2' }),
    )
    render(<MailList userId="user-1" q="" />, { wrapper: createWrapper() })
    await screen.findByText('Message first')
    await waitFor(() => expect(client.fetchMailMessages).toHaveBeenCalledTimes(2))

    expect(screen.queryAllByTestId('mail-message-skeleton')).toHaveLength(0)
    expect(screen.getByRole('region', { name: 'Inbox message list' })).toHaveAttribute(
      'aria-busy',
      'false',
    )
    expect(screen.getByText('Message first')).toBeInTheDocument()
  })

  it('keeps populated cards during a background refetch without skeleton replacement', async () => {
    let resolveRefetch:
      | ((page: { items: ReturnType<typeof message>[]; nextCursor: null }) => void)
      | undefined
    client.fetchMailMessages
      .mockResolvedValueOnce({ items: [message('first')], nextCursor: null })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveRefetch = resolve
          }),
      )
    render(<MailList userId="user-1" q="" />, { wrapper: createWrapper() })
    await screen.findByText('Message first')

    act(() => {
      void activeQueryClient.invalidateQueries({
        queryKey: ['mail-messages-page', 'user-1', ''],
        refetchType: 'none',
      })
      void activeQueryClient.invalidateQueries({
        queryKey: ['mail-messages', 'user-1', ''],
        exact: true,
      })
    })
    await waitFor(() => expect(client.fetchMailMessages).toHaveBeenCalledTimes(2))

    expect(screen.getByText('Message first')).toBeInTheDocument()
    expect(screen.queryAllByTestId('mail-message-skeleton')).toHaveLength(0)
    resolveRefetch?.({ items: [message('updated')], nextCursor: null })
    await screen.findByText('Message updated')
  })

  it('auto-fills an underfilled scroll root and serializes repeated intersection events', async () => {
    let resolveSecondPage:
      | ((page: { items: ReturnType<typeof message>[]; nextCursor: string | null }) => void)
      | undefined
    const secondPage = new Promise<{
      items: ReturnType<typeof message>[]
      nextCursor: string | null
    }>((resolve) => {
      resolveSecondPage = resolve
    })
    client.fetchMailMessages.mockImplementation(({ cursor }: { cursor?: string }) => {
      if (cursor === 'cursor-2') return secondPage
      if (cursor === 'cursor-3')
        return Promise.resolve({ items: [message('third')], nextCursor: null })
      return Promise.resolve({ items: [message('first')], nextCursor: 'cursor-2' })
    })

    render(<MailList userId="user-1" q="" />, { wrapper: createWrapper() })
    await screen.findByText('Message first')
    await waitFor(() =>
      expect(client.fetchMailMessages).toHaveBeenCalledWith(
        expect.objectContaining({ cursor: 'cursor-2' }),
      ),
    )

    for (const observer of VisibleIntersectionObserver.instances) observer.notify()
    expect(
      client.fetchMailMessages.mock.calls.filter(([input]) => input.cursor === 'cursor-2'),
    ).toHaveLength(1)

    resolveSecondPage?.({ items: [message('second')], nextCursor: 'cursor-3' })
    await screen.findByText('Message second')
    await screen.findByText('Message third')
    await waitFor(() =>
      expect(client.fetchMailMessages.mock.calls.filter(([input]) => input.cursor)).toHaveLength(2),
    )
  })
})
