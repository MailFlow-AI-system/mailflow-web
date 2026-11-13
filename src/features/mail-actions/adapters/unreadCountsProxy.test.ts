import { describe, expect, it, vi } from 'vitest'
import { createUnreadCountsProxy } from './unreadCountsProxy'

const webOrigin = 'http://acme.workspace.test'
const apiOrigin = 'https://api.example.test'
const cookie = { Cookie: 'better-auth.session_token=opaque', 'X-Workspace-Identity': 'u1' }

describe('createUnreadCountsProxy', () => {
  it('forwards the current user counts for the workspace host', async () => {
    let upstream: URL | undefined
    let identity: string | null = null
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      upstream = new URL(String(input))
      identity = new Headers(init?.headers).get('X-Workspace-Identity')
      return Response.json(
        { inbox: 3, starred: 0, archive: 0, trash: 0, spam: 1 },
        { headers: { 'X-Workspace-Identity': 'u1' } },
      )
    })
    const response = await createUnreadCountsProxy(
      apiOrigin,
      fetcher,
      'workspace.test',
    )(new Request(`${webOrigin}/api/mail/unread-counts`, { headers: cookie }))

    expect(response.status).toBe(200)
    expect(upstream?.href).toBe(`${apiOrigin}/api/v1/workspaces/acme/mail/unread-counts`)
    expect(identity).toBe('u1')
    expect(response.headers.get('x-workspace-identity')).toBe('u1')
    expect(await response.json()).toMatchObject({ inbox: 3, spam: 1 })
  })

  it('rejects writes, other hosts and anonymous requests without contacting Core', async () => {
    const fetcher = vi.fn()
    const proxy = createUnreadCountsProxy(apiOrigin, fetcher, 'workspace.test')
    const post = await proxy(
      new Request(`${webOrigin}/api/mail/unread-counts`, { method: 'POST', headers: cookie }),
    )
    const bare = await proxy(new Request('http://workspace.test/api/mail/unread-counts'))
    const anonymous = await proxy(new Request(`${webOrigin}/api/mail/unread-counts`))
    expect([post.status, bare.status, anonymous.status]).toEqual([404, 404, 401])
    expect(fetcher).not.toHaveBeenCalled()
  })
})
