import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getCurrentSession } from '#/features/auth/adapters/getCurrentSession'
import { WorkspaceIdentityChangedError } from '#/features/workspaces/clients/workspaceIdentityChangedError'
import { fetchSentEmails, readSentWorkspace } from './sentEmailsClient'

vi.mock('#/features/auth/adapters/getCurrentSession', () => ({ getCurrentSession: vi.fn() }))
const workspace = { id: 'workspace-a', name: 'Acme', slug: 'acme', role: 'owner' }
const response = (body: unknown, identity = 'owner', workspaceId = workspace.id) =>
  Response.json(body, {
    headers: { 'X-Workspace-Identity': identity, 'X-Workspace-Id': workspaceId },
  })
beforeEach(() =>
  vi
    .mocked(getCurrentSession)
    .mockResolvedValue({ id: 'owner', name: 'Owner', email: 'owner@example.test' }),
)
afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetAllMocks()
})

describe('Sent response scope', () => {
  it('requests only the selected workspace and validates identity, scope and a live session', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => response({ items: [], nextOffset: null }))
    vi.stubGlobal('fetch', fetcher)
    const signal = new AbortController().signal
    await expect(fetchSentEmails('owner', workspace.id, 20, signal)).resolves.toEqual({
      items: [],
      nextOffset: null,
    })
    expect(fetcher.mock.calls[0]?.[0]).toBe('/api/mail/sent?offset=20')
    const headers = new Headers(fetcher.mock.calls[0]?.[1]?.headers)
    expect(headers.get('X-Workspace-Identity')).toBe('owner')
    expect(headers.get('X-Workspace-Id')).toBe(workspace.id)
    expect(getCurrentSession).toHaveBeenCalledWith({ signal })
  })

  it.each(['', 'workspace-b'])(
    'rejects an unexpected workspace header %j before parsing body',
    async (actual) => {
      const reply = response({ items: [], nextOffset: null }, 'owner', actual)
      const read = vi.spyOn(reply, 'json')
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => reply),
      )
      await expect(
        fetchSentEmails('owner', workspace.id, 0, new AbortController().signal),
      ).rejects.toThrow('scope')
      expect(read).not.toHaveBeenCalled()
    },
  )

  it('rejects responses delayed across logout or a new identity', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => response({ items: [], nextOffset: null })),
    )
    vi.mocked(getCurrentSession).mockResolvedValueOnce({ id: 'another-user', name: '', email: '' })
    await expect(
      fetchSentEmails('owner', workspace.id, 0, new AbortController().signal),
    ).rejects.toBeInstanceOf(WorkspaceIdentityChangedError)
  })

  it('does not cache a response after the old pagination scope was cancelled', async () => {
    const controller = new AbortController()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        controller.abort()
        return response({ items: [], nextOffset: null })
      }),
    )
    await expect(
      fetchSentEmails('owner', workspace.id, 20, controller.signal),
    ).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('resolves the default through mail authority even without workspace UI flags', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => response({ userId: 'owner', workspace }))
    vi.stubGlobal('fetch', fetcher)
    await expect(readSentWorkspace('owner', new AbortController().signal)).resolves.toEqual(
      workspace,
    )
    expect(fetcher.mock.calls[0]?.[0]).toBe('/api/mail/context')
  })

  it.each([null, { ...workspace, id: '' }])(
    'refuses a missing or invalid default workspace (%j)',
    async (current) => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => response({ userId: 'owner', workspace: current })),
      )
      await expect(readSentWorkspace('owner', new AbortController().signal)).rejects.toThrow()
    },
  )

  it('rejects a context body belonging to a different identity', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => response({ userId: 'other', workspace })),
    )
    await expect(readSentWorkspace('owner', new AbortController().signal)).rejects.toBeInstanceOf(
      WorkspaceIdentityChangedError,
    )
  })
})
