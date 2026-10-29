import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const client = vi.hoisted(() => ({ fetchMailMessages: vi.fn() }))

vi.mock('../clients/mailMessagesClient', () => client)

import { MailSelectionProvider } from '#/features/mail-selection/components/MailSelectionProvider'
import { MailList } from './MailList'

const message = (id: string) => ({
  id,
  senderName: `Sender ${id}`,
  subject: `Subject ${id}`,
  body: `Body ${id}`,
  receivedAt: '2026-10-01T12:00:00.000Z',
})

class HiddenIntersectionObserver {
  observe() {}
  disconnect() {}
}

let queryClient: QueryClient

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <MailSelectionProvider>{children}</MailSelectionProvider>
    </QueryClientProvider>
  )
}

function mockInbox() {
  client.fetchMailMessages.mockImplementation(
    async ({ q, cursor }: { q: string; cursor: string | null }) => {
      if (q === 'sender') return { items: [message('c')], nextCursor: null }
      if (cursor === 'next') return { items: [message('c')], nextCursor: null }
      return { items: [message('a'), message('b')], nextCursor: 'next' }
    },
  )
}

const rowCheckbox = (id: string) =>
  screen.getByRole('checkbox', { name: `Select message from Sender ${id}: Subject ${id}` })
const selectAll = () => screen.getByRole('checkbox', { name: 'Select all loaded messages' })

describe('MailList selection', () => {
  beforeEach(() => {
    client.fetchMailMessages.mockReset()
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: 0, gcTime: Infinity } } })
    vi.stubGlobal('IntersectionObserver', HiddenIntersectionObserver)
    mockInbox()
  })

  afterEach(() => {
    cleanup()
    queryClient.clear()
    vi.unstubAllGlobals()
  })

  async function renderList(q = '') {
    const view = render(<MailList heading="Inbox" workspaceSlug="acme" userId="user-1" q={q} />, {
      wrapper: Wrapper,
    })
    await screen.findByText('Subject a')
    return view
  }

  it('selects one message, then several, and deselects them individually', async () => {
    const user = userEvent.setup()
    await renderList()

    await user.click(rowCheckbox('a'))
    expect(rowCheckbox('a')).toHaveAttribute('aria-checked', 'true')
    expect(rowCheckbox('b')).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByText('1 selected')).toBeInTheDocument()
    expect(selectAll()).toHaveAttribute('aria-checked', 'mixed')

    await user.click(rowCheckbox('b'))
    expect(screen.getByText('2 selected')).toBeInTheDocument()
    expect(selectAll()).toHaveAttribute('aria-checked', 'true')

    await user.click(rowCheckbox('a'))
    expect(rowCheckbox('a')).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByText('1 selected')).toBeInTheDocument()
  })

  it('marks selected rows visually and leaves the others untouched', async () => {
    const user = userEvent.setup()
    await renderList()

    await user.click(rowCheckbox('a'))

    const rows = screen.getAllByRole('listitem')
    expect(rows[0]).toHaveClass('bg-primary/10')
    expect(rows[0]).toHaveAttribute('data-selected', 'true')
    expect(rows[1]).not.toHaveClass('bg-primary/10')
  })

  it('selects all loaded messages, including pages loaded later, and clears them', async () => {
    const user = userEvent.setup()
    await renderList()

    await user.click(selectAll())
    expect(screen.getByText('2 selected')).toBeInTheDocument()

    await user.click(await screen.findByRole('button', { name: 'Load more messages' }))
    await screen.findByText('Subject c')
    expect(rowCheckbox('c')).toHaveAttribute('aria-checked', 'false')
    expect(selectAll()).toHaveAttribute('aria-checked', 'mixed')

    await user.click(selectAll())
    expect(screen.getByText('3 selected')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Clear selection' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Inbox' })).not.toHaveClass('sr-only')
    for (const id of ['a', 'b', 'c'])
      expect(rowCheckbox(id)).toHaveAttribute('aria-checked', 'false')
  })

  it('keeps the selection while the search changes the list, and restores it when it returns', async () => {
    const user = userEvent.setup()
    const view = await renderList()
    await user.click(rowCheckbox('a'))

    view.rerender(<MailList heading="Inbox" workspaceSlug="acme" userId="user-1" q="sender" />)
    await screen.findByText('Subject c')
    expect(screen.queryByText('Subject a')).not.toBeInTheDocument()
    expect(screen.getByText('1 selected')).toBeInTheDocument()
    expect(screen.getByText('1 hidden by search')).toBeInTheDocument()
    expect(rowCheckbox('c')).toHaveAttribute('aria-checked', 'false')
    expect(selectAll()).toHaveAttribute('aria-checked', 'false')

    await user.click(rowCheckbox('c'))
    expect(screen.getByText('2 selected')).toBeInTheDocument()

    view.rerender(<MailList heading="Inbox" workspaceSlug="acme" userId="user-1" q="" />)
    await screen.findByText('Subject a')
    expect(rowCheckbox('a')).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText('2 selected')).toBeInTheDocument()
    // Message c is still selected but sits on a page that is not loaded in this list.
    expect(screen.getByText('1 not loaded')).toBeInTheDocument()
  })

  it('points Select all at the message list region it controls', async () => {
    await renderList()

    const region = screen.getByRole('region', { name: 'Inbox message list' })
    expect(region.id).not.toBe('')
    expect(selectAll()).toHaveAttribute('aria-controls', region.id)
  })

  it('does not show the selection bar or checkboxes without a selection provider', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MailList workspaceSlug="acme" userId="user-1" q="" />
      </QueryClientProvider>,
    )
    await screen.findByText('Subject a')

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Message selection' })).not.toBeInTheDocument()
  })

  it('disables Select all while the first page loads and keeps skeleton rows unchanged', () => {
    client.fetchMailMessages.mockImplementation(() => new Promise(() => {}))
    render(<MailList heading="Inbox" workspaceSlug="acme" userId="user-1" q="" />, {
      wrapper: Wrapper,
    })

    expect(selectAll()).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getAllByTestId('mail-message-skeleton')).toHaveLength(8)
    expect(screen.getByRole('heading', { level: 1, name: 'Inbox' })).toBeInTheDocument()
  })

  it('announces selection changes in a status region separate from the list status', async () => {
    const user = userEvent.setup()
    await renderList()
    const region = screen.getByRole('region', { name: 'Inbox message list' })

    await user.click(rowCheckbox('a'))

    await waitFor(() =>
      expect(
        screen.getAllByRole('status').some((node) => node.textContent === '1 message selected'),
      ).toBe(true),
    )
    for (const status of screen.getAllByRole('status')) expect(region).not.toContainElement(status)
    expect(within(region).getAllByRole('checkbox')).toHaveLength(2)
  })
})

describe('MailList selection on touch screens', () => {
  beforeEach(() => {
    client.fetchMailMessages.mockReset()
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: 0, gcTime: Infinity } } })
    vi.stubGlobal('IntersectionObserver', HiddenIntersectionObserver)
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: true,
        addEventListener: () => {},
        removeEventListener: () => {},
      })),
    )
    mockInbox()
  })

  afterEach(() => {
    vi.useRealTimers()
    cleanup()
    queryClient.clear()
    vi.unstubAllGlobals()
  })

  async function renderTouchList() {
    render(<MailList heading="Inbox" workspaceSlug="acme" userId="user-1" q="" />, {
      wrapper: Wrapper,
    })
    await screen.findByText('Subject a')
  }

  it('shows Select instead of hidden checkboxes at rest', async () => {
    await renderTouchList()

    expect(screen.getByRole('button', { name: 'Select' })).toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })

  it('enters selection mode, selects whole rows by tapping anywhere on them, and exits', async () => {
    const user = userEvent.setup()
    await renderTouchList()

    await user.click(screen.getByRole('button', { name: 'Select' }))
    expect(screen.getByText('Select items')).toBeInTheDocument()
    expect(rowCheckbox('a')).toHaveAttribute('aria-checked', 'false')

    await user.click(screen.getByText('Body a'))
    expect(rowCheckbox('a')).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText('1 selected')).toBeInTheDocument()

    await user.click(screen.getByText('Subject b'))
    expect(screen.getByText('2 selected')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Deselect all' })).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'Clear selection and exit selection mode' }),
    )
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Select' })).toBeInTheDocument()
  })

  it('stays in selection mode after the last item is deselected', async () => {
    const user = userEvent.setup()
    await renderTouchList()
    await user.click(screen.getByRole('button', { name: 'Select' }))

    await user.click(screen.getByText('Subject a'))
    await user.click(screen.getByText('Subject a'))

    expect(screen.getByText('Select items')).toBeInTheDocument()
    expect(rowCheckbox('b')).toBeInTheDocument()
  })

  it('starts selecting with the pressed row after holding it', async () => {
    await renderTouchList()
    vi.useFakeTimers()

    fireEvent.pointerDown(screen.getByText('Subject b'))
    act(() => vi.advanceTimersByTime(500))
    vi.useRealTimers()

    expect(screen.getByText('1 selected')).toBeInTheDocument()
    expect(rowCheckbox('b')).toHaveAttribute('aria-checked', 'true')
    expect(rowCheckbox('a')).toHaveAttribute('aria-checked', 'false')
  })

  it('shows the hidden-selection strip when a search hides selected messages', async () => {
    const user = userEvent.setup()
    const view = render(<MailList heading="Inbox" workspaceSlug="acme" userId="user-1" q="" />, {
      wrapper: Wrapper,
    })
    await screen.findByText('Subject a')
    await user.click(screen.getByRole('button', { name: 'Select' }))
    await user.click(screen.getByText('Subject a'))

    view.rerender(<MailList heading="Inbox" workspaceSlug="acme" userId="user-1" q="sender" />)
    await screen.findByText('Subject c')

    expect(screen.getByText('1 selected message is hidden by search')).toBeInTheDocument()
  })
})
