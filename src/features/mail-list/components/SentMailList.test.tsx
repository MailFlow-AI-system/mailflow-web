import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
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
    expect(screen.getByRole('status')).toHaveTextContent('Carregando')
    expect(await screen.findByText('Hello')).toBeVisible()
    expect(screen.getByText('Para: ada@example.test')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Carregar mais' }))
    await screen.findByText('1 e-mail enviado')
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
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar')
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(await screen.findByText('Nenhum e-mail enviado.')).toBeVisible()
  })
})
