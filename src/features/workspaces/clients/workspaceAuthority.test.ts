import { afterEach, describe, expect, it, vi } from 'vitest'
import { getCurrentSession } from '../../auth/adapters/getCurrentSession'
import { readWorkspaceResponse, WorkspaceIdentityChangedError } from './workspaceAuthority'

vi.mock('../../auth/adapters/getCurrentSession', () => ({ getCurrentSession: vi.fn() }))
const session = (id: string) => ({ id, name: 'Fixture', email: 'fixture@example.test' })
const response = (id = 'actor') =>
  Response.json(
    { workspace: { id: 'a' } },
    {
      headers: { 'X-Workspace-Identity': id },
    },
  )

describe('workspace response authority', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetAllMocks()
  })

  it('binds the response to the mounted identity and rechecks a live session without cache', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(response())
    vi.mocked(getCurrentSession).mockResolvedValueOnce(session('actor'))
    vi.stubGlobal('fetch', fetcher)
    const signal = new AbortController().signal
    await expect(readWorkspaceResponse('/api/workspace-context', 'actor', signal)).resolves.toEqual(
      { workspace: { id: 'a' } },
    )
    expect(getCurrentSession).toHaveBeenCalledWith({ signal })
  })

  it('rejects a different actor before parsing or caching its data', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(response('other'))
    vi.stubGlobal('fetch', fetcher)
    await expect(
      readWorkspaceResponse('/api/v1/workspaces', 'actor', new AbortController().signal),
    ).rejects.toBeInstanceOf(WorkspaceIdentityChangedError)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it.each([null, 'other'])(
    'rejects an old response after the live session becomes %s',
    async (id) => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response()))
      vi.mocked(getCurrentSession).mockResolvedValueOnce(id ? session(id) : null)
      await expect(
        readWorkspaceResponse('/api/workspace-context', 'actor', new AbortController().signal),
      ).rejects.toBeInstanceOf(WorkspaceIdentityChangedError)
    },
  )

  it('fails closed when an older Core does not provide identity binding', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(Response.json({ workspace: null })))
    await expect(
      readWorkspaceResponse('/api/workspace-context', 'actor', new AbortController().signal),
    ).rejects.toThrow('Workspace identity could not be verified')
  })

  it('does not mistake an upstream outage for a changed identity', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response()))
    vi.mocked(getCurrentSession).mockRejectedValueOnce(
      new Error('Workspace identity could not be verified'),
    )
    await expect(
      readWorkspaceResponse('/api/workspace-context', 'actor', new AbortController().signal),
    ).rejects.toThrow('Workspace identity could not be verified')
  })

  it('does not accept a response after its query has been cancelled', async () => {
    const controller = new AbortController()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        controller.abort()
        return response()
      }),
    )
    await expect(
      readWorkspaceResponse('/api/workspace-context', 'actor', controller.signal),
    ).rejects.toMatchObject({ name: 'AbortError' })
  })
})
