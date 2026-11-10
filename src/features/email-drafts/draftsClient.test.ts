import { afterEach, describe, expect, it, vi } from 'vitest'
import { getCurrentSession } from '#/features/auth/adapters/getCurrentSession'
import { fetchDraftPage } from './draftsClient'

vi.mock('#/features/auth/adapters/getCurrentSession', () => ({ getCurrentSession: vi.fn() }))
const page = { items: [], nextOffset: null }
const reply = () =>
  Response.json(page, { headers: { 'X-Workspace-Identity': 'owner', 'X-Workspace-Id': 'ws-a' } })
afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetAllMocks()
})

describe('draft list client', () => {
  it('sends the workspace, the offset and only a non-empty trimmed search text', async () => {
    vi.mocked(getCurrentSession).mockResolvedValue({ id: 'owner', name: '', email: '' })
    const fetcher = vi.fn<typeof fetch>(async () => reply())
    vi.stubGlobal('fetch', fetcher)
    const signal = new AbortController().signal
    await expect(fetchDraftPage('owner', 'ws-a', 20, signal, ' budget & 50% ')).resolves.toEqual(
      page,
    )
    expect(fetcher.mock.calls[0]?.[0]).toBe('/api/mail/drafts?offset=20&q=budget%20%26%2050%25')
    expect(new Headers(fetcher.mock.calls[0]?.[1]?.headers).get('X-Workspace-Id')).toBe('ws-a')
    await fetchDraftPage('owner', 'ws-a', 0, signal)
    expect(fetcher.mock.calls[1]?.[0]).toBe('/api/mail/drafts?offset=0')
  })
  it('rejects a response from another workspace', async () => {
    vi.mocked(getCurrentSession).mockResolvedValue({ id: 'owner', name: '', email: '' })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => reply()),
    )
    await expect(fetchDraftPage('owner', 'ws-b', 0, new AbortController().signal)).rejects.toThrow()
  })
})
