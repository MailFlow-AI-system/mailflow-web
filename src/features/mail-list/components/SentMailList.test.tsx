import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../hooks/useMailMessages', () => ({ useMailMessages: vi.fn() }))

import { SentMailList } from './SentMailList'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})
function mount() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <SentMailList userId="owner" />
    </QueryClientProvider>,
  )
}
describe('SentMailList', () => {
  it('shows loading, persisted sent emails and pagination', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({
          items: [
            {
              id: 'id',
              to: ['ada@example.test'],
              cc: [],
              bcc: [],
              subject: 'Hello',
              text: 'Body',
              sentAt: '2026-10-26T12:00:00.000Z',
            },
          ],
          nextOffset: 20,
        }),
      )
      .mockResolvedValueOnce(Response.json({ items: [], nextOffset: null }))
    vi.stubGlobal('fetch', fetcher)
    mount()
    expect(screen.getByRole('status')).toHaveTextContent('Loading messages')
    expect(screen.getAllByTestId('mail-message-skeleton')).toHaveLength(8)
    expect(await screen.findByText('Hello')).toBeVisible()
    const region = screen.getByRole('region', { name: 'Sent message list' })
    const row = within(region).getByRole('listitem')
    expect(within(row).getByText('ada@example.test')).toBeVisible()
    expect(within(row).getByText('A').closest('[aria-hidden="true"]')).toBeInTheDocument()
    expect(within(row).getByText('Body')).toBeVisible()
    expect(within(row).queryByRole('button')).toBeNull()
    expect(within(row).queryByRole('link')).toBeNull()
    expect(row.querySelector('time')).toBeNull()
    fireEvent.click(row)
    expect(screen.getByText('Hello')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Load more messages' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('1 message loaded'))
    expect(fetcher.mock.calls[1]?.[0]).toBe('/api/mail/sent?offset=20')
  })
  it('shows a retry action after failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(new Response(null, { status: 502 }))
        .mockResolvedValueOnce(Response.json({ items: [], nextOffset: null })),
    )
    mount()
    expect(await screen.findByRole('alert')).toHaveTextContent('Messages could not be loaded.')
    fireEvent.click(screen.getByRole('button', { name: 'Retry loading messages' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('No messages found.'))
    expect(within(screen.getByRole('region')).getByText('No messages found.')).toBeVisible()
  })
  it('keeps loaded cards when the next page fails, retries, and removes duplicate messages', async () => {
    const message = {
      id: 'first',
      to: ['ada@example.test'],
      cc: ['cc@example.test'],
      bcc: ['bcc@example.test'],
      subject: 'First message',
      text: 'Body preview',
      sentAt: null,
    }
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ items: [message], nextOffset: 20 }))
      .mockResolvedValueOnce(new Response(null, { status: 502 }))
      .mockResolvedValueOnce(
        Response.json({
          items: [message, { ...message, id: 'second', subject: 'Second message' }],
          nextOffset: null,
        }),
      )
    vi.stubGlobal('fetch', fetcher)
    mount()
    await screen.findByText('First message')
    expect(screen.queryByText(/cc@example|bcc@example/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Load more messages' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Retry loading messages' }))
    expect(screen.getByText('First message')).toBeVisible()
    await screen.findByText('Second message')
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('2 messages loaded'))
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
      '/api/mail/sent?offset=0',
      '/api/mail/sent?offset=20',
      '/api/mail/sent?offset=20',
    ])
  })
  it.each([undefined, '', '   ', 'Ada Lovelace'])(
    'shows the recipient name when available and falls back to the email (%s)',
    async (recipientName) => {
      vi.stubGlobal(
        'fetch',
        vi.fn<typeof fetch>(async () =>
          Response.json({
            items: [
              {
                id: 'named',
                to: ['ada@example.test'],
                cc: [],
                bcc: [],
                recipientName,
                subject: 'Named message',
                text: 'Body',
                sentAt: null,
              },
            ],
            nextOffset: null,
          }),
        ),
      )
      mount()
      await screen.findByText('Named message')
      if (recipientName?.trim()) {
        expect(screen.getByText('Ada Lovelace')).toBeVisible()
        expect(screen.queryByText('ada@example.test')).toBeNull()
        expect(screen.getByText('AL')).toBeInTheDocument()
      } else {
        expect(screen.getByText('ada@example.test')).toBeVisible()
      }
    },
  )
  it('keeps the avatar color fixed to the primary recipient independently of its display name', async () => {
    const items = [
      {
        id: 'first',
        to: ['ada@example.test'],
        recipientName: 'Ada Lovelace',
        subject: 'First send',
      },
      {
        id: 'second',
        to: ['ADA@EXAMPLE.TEST'],
        recipientName: 'Different name',
        subject: 'Second send',
      },
      {
        id: 'third',
        to: ['bea@example.test'],
        recipientName: 'Ada Lovelace',
        subject: 'Other recipient',
      },
      {
        id: 'fourth',
        to: ['amy@example.test'],
        recipientName: 'Ada Lovelace',
        subject: 'Another recipient',
      },
    ].map((message) => ({ ...message, cc: [], bcc: [], text: 'Body', sentAt: null }))
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(async () => Response.json({ items, nextOffset: null })),
    )
    const view = mount()
    await screen.findByText('First send')
    const color = (subject: string) =>
      screen.getByText(subject).closest('li')?.querySelector('[data-slot="avatar-fallback"]')
        ?.className
    const firstColor = color('First send')
    expect(firstColor).toBeTruthy()
    expect(color('Second send')).toBe(firstColor)
    expect(
      new Set(['First send', 'Other recipient', 'Another recipient'].map(color)).size,
    ).toBeGreaterThan(1)
    view.unmount()
    mount()
    await screen.findByText('First send')
    expect(color('First send')).toBe(firstColor)
  })
})
