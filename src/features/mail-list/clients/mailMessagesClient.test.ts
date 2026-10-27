import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('#/features/auth/adapters/getCurrentSession', () => ({
  getCurrentSession: async () => ({ id: 'user-1' }),
}))

import { fetchMailMessages } from './mailMessagesClient'

describe('fetchMailMessages', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('requests the same-origin page endpoint with normalized search and cursor', async () => {
    let requestedUrl = ''
    let requestInit: RequestInit | undefined
    const fetcher: typeof fetch = async (input, init) => {
      requestedUrl = String(input)
      requestInit = init
      return Response.json(
        {
          items: [
            {
              id: 'message-1',
              senderName: 'Ada Lovelace',
              subject: 'Invoice',
              body: 'Please review.',
              receivedAt: '2026-10-01T12:00:00.000Z',
            },
          ],
          nextCursor: null,
        },
        { headers: { 'X-Workspace-Identity': 'user-1' } },
      )
    }
    vi.stubGlobal('fetch', fetcher)
    const controller = new AbortController()

    const page = await fetchMailMessages({
      userId: 'user-1',
      q: '  invoice  ',
      cursor: 'next',
      signal: controller.signal,
    })

    expect(requestedUrl).toBe('/api/mail/messages?q=invoice&cursor=next')
    expect(requestInit).toMatchObject({
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
      signal: controller.signal,
    })
    expect(page.items[0]?.senderName).toBe('Ada Lovelace')
    expect(page.nextCursor).toBeNull()
  })

  it('throws a safe error for unsuccessful responses', async () => {
    const fetcher: typeof fetch = async () =>
      Response.json({ message: 'private details' }, { status: 502 })
    vi.stubGlobal('fetch', fetcher)

    await expect(
      fetchMailMessages({ userId: 'user-1', q: '', signal: new AbortController().signal }),
    ).rejects.toThrow('Workspace request failed')
  })
})
