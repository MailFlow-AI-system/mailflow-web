import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const client = vi.hoisted(() => ({ fetchMailMessages: vi.fn() }))
let activeQueryClient: QueryClient | undefined

vi.mock('../clients/mailMessagesClient', () => client)

import { mailMessagesPageKey } from '../queries/mailMessagesQuery'
import { useMailMessages } from './useMailMessages'

const message = (id: string) => ({
  id,
  senderName: 'Ada Lovelace',
  subject: `Message ${id}`,
  body: `Body ${id}`,
  receivedAt: '2026-10-01T12:00:00.000Z',
})

function makePage(ids: string[], nextCursor: string | null) {
  return { items: ids.map(message), nextCursor }
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: 0, gcTime: Infinity } },
  })
  activeQueryClient = queryClient

  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }

  return { Wrapper, queryClient }
}

describe('useMailMessages', () => {
  beforeEach(() => client.fetchMailMessages.mockReset())
  afterEach(async () => {
    cleanup()
    await activeQueryClient?.cancelQueries()
    activeQueryClient?.clear()
    client.fetchMailMessages.mockReset()
  })

  it('warms exactly the next page in the shared cache and displays it only after advancement', async () => {
    const signals: AbortSignal[] = []
    client.fetchMailMessages.mockImplementation(
      async (input: { cursor?: string; signal: AbortSignal } | undefined) => {
        if (!input) throw new Error('Mail page query was called without input.')
        const { cursor, signal } = input
        signals.push(signal)
        return cursor ? makePage(['second'], null) : makePage(['first'], 'cursor-2')
      },
    )
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useMailMessages('user-1', ''), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.messages.map(({ id }) => id)).toEqual(['first']))
    await waitFor(() =>
      expect(client.fetchMailMessages).toHaveBeenCalledWith(
        expect.objectContaining({ q: '', cursor: 'cursor-2' }),
      ),
    )
    expect(result.current.messages.map(({ id }) => id)).toEqual(['first'])
    expect(signals.every((signal) => !signal.aborted)).toBe(true)

    await act(async () => {
      await result.current.fetchNextPage()
    })

    await waitFor(() =>
      expect(result.current.messages.map(({ id }) => id)).toEqual(['first', 'second']),
    )
    expect(
      client.fetchMailMessages.mock.calls.filter(([input]) => input.cursor === 'cursor-2'),
    ).toHaveLength(1)
    expect(signals.every((signal) => !signal.aborted)).toBe(true)
  })

  it('uses a warmed first page as immediate infinite-query data without another request', () => {
    client.fetchMailMessages.mockImplementation(() => {
      throw new Error('A warmed first page should not trigger another request.')
    })
    const { Wrapper, queryClient } = createWrapper()
    queryClient.setQueryData(
      mailMessagesPageKey('user-1', 'invoice', null),
      makePage(['cached'], null),
    )

    const { result } = renderHook(() => useMailMessages('user-1', 'invoice'), {
      wrapper: Wrapper,
    })

    expect(result.current.isPending).toBe(false)
    expect(result.current.messages.map(({ id }) => id)).toEqual(['cached'])
    expect(client.fetchMailMessages).not.toHaveBeenCalled()
  })

  it('aborts prior search pages when q changes and loads the new search independently', async () => {
    let oldSignal: AbortSignal | undefined
    client.fetchMailMessages.mockImplementation(
      ({ q, signal }: { q: string; signal: AbortSignal }) => {
        if (q === 'old') {
          oldSignal = signal
          return new Promise((_resolve, reject) => {
            signal.addEventListener('abort', () =>
              reject(new DOMException('Aborted', 'AbortError')),
            )
          })
        }
        return Promise.resolve(makePage(['new-result'], null))
      },
    )
    const { Wrapper } = createWrapper()
    const { result, rerender } = renderHook(({ q }) => useMailMessages('user-1', q), {
      initialProps: { q: 'old' },
      wrapper: Wrapper,
    })

    await waitFor(() => expect(oldSignal).toBeDefined())
    rerender({ q: 'new' })

    await waitFor(() => expect(oldSignal?.aborted).toBe(true))
    await waitFor(() => expect(result.current.messages.map(({ id }) => id)).toEqual(['new-result']))
    expect(client.fetchMailMessages).toHaveBeenCalledWith(expect.objectContaining({ q: 'new' }))
  })

  it('keeps visible messages after a warm-page failure and retries when the user advances', async () => {
    let nextPageAttempts = 0
    client.fetchMailMessages.mockImplementation(async ({ cursor }: { cursor?: string }) => {
      if (!cursor) return makePage(['first'], 'cursor-2')
      nextPageAttempts += 1
      if (nextPageAttempts < 3) throw new Error('temporary failure')
      return makePage(['second'], null)
    })
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useMailMessages('user-1', ''), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.messages.map(({ id }) => id)).toEqual(['first']))
    await waitFor(() => expect(nextPageAttempts).toBe(2))
    expect(result.current.messages.map(({ id }) => id)).toEqual(['first'])

    await act(async () => {
      await result.current.fetchNextPage()
    })

    await waitFor(() =>
      expect(result.current.messages.map(({ id }) => id)).toEqual(['first', 'second']),
    )
    expect(nextPageAttempts).toBe(3)
  })
})
