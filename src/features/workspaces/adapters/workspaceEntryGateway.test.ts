import { describe, expect, it, vi } from 'vitest'
import { readWorkspaceEntryBootstrap } from './workspaceEntryBootstrap'
import { createWorkspaceEntryGateway } from './workspaceEntryGateway'

const cookie = 'better-auth.session_token=synthetic; private=discard'
const workspace = { id: 'b', name: 'Northwind', slug: 'northwind', role: 'member' }
const request = (url = 'http://workspace.test:3003/api/v1/workspace-entry') =>
  new Request(url, {
    headers: { Cookie: cookie, 'X-Forwarded-Host': 'evil.test', traceparent: 'synthetic-trace' },
  })

describe('authenticated generic workspace entry', () => {
  it('filters credentials, validates the DTO, propagates correlation and never forwards a redirect or cookie', async () => {
    const fetcher = vi.fn(async () =>
      Response.json(
        { source: 'preference', workspace },
        { headers: { 'X-Request-ID': 'correlation', 'Set-Cookie': 'private=secret' } },
      ),
    )
    const response = await createWorkspaceEntryGateway(
      'https://core.test',
      'workspace.test',
      true,
      fetcher,
    )(request())
    expect(await response.json()).toEqual({ source: 'preference', workspace })
    expect(fetcher.mock.calls[0]).toMatchObject([
      new URL('https://core.test/api/v1/workspace-entry'),
      {
        headers: { Cookie: 'better-auth.session_token=synthetic' },
        redirect: 'manual',
        cache: 'no-store',
      },
    ])
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(response.headers.get('x-request-id')).toBe('correlation')
    expect(response.headers.get('set-cookie')).toBeNull()
  })
  it('rejects another environment, explicit hosts, no credentials and untrusted selectors without contacting Core', async () => {
    const fetcher = vi.fn(async () => Response.json({}))
    const gateway = createWorkspaceEntryGateway(
      'https://core.test',
      'workspace.test',
      true,
      fetcher,
    )
    for (const [url, status] of [
      ['http://workers.dev/api/v1/workspace-entry', 404],
      ['http://acme.workspace.test/api/v1/workspace-entry', 404],
      ['http://workspace.test/api/v1/workspace-entry?userId=other', 400],
      ['http://workspace.test/api/v1/workspace-entry?redirect=https://evil.test', 400],
    ] as const)
      expect((await gateway(request(url))).status).toBe(status)
    expect(
      (await gateway(new Request('http://workspace.test/api/v1/workspace-entry'))).status,
    ).toBe(401)
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('cannot run outside the local release gate', async () => {
    const fetcher = vi.fn()
    expect(
      (
        await createWorkspaceEntryGateway(
          'https://core.test',
          'workspace.test',
          false,
          fetcher,
        )(request())
      ).status,
    ).toBe(503)
    expect(
      (
        await createWorkspaceEntryGateway(
          'https://core.test',
          'web.production.test',
          true,
          fetcher,
        )(request('https://web.production.test/api/v1/workspace-entry'))
      ).status,
    ).toBe(503)
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('sanitizes invalid success payloads, transport failures and upstream redirects', async () => {
    for (const fetcher of [
      async () => new Response(null, { status: 302, headers: { Location: 'https://evil.test' } }),
      async () => Response.json({ source: 'none', workspace }),
      async () =>
        Response.json({
          source: 'preference',
          workspace: { ...workspace, slug: 'evil.test/path' },
        }),
      async () => {
        throw new Error('private database details')
      },
    ]) {
      const response = await createWorkspaceEntryGateway(
        'https://core.test',
        'workspace.test',
        true,
        fetcher,
      )(request())
      expect(response.status).toBe(502)
      expect(await response.json()).toEqual({ code: 'workspace_entry_failed' })
    }
  })
  it('keeps authentication failures and retry hints without upstream details', async () => {
    for (const status of [401, 429]) {
      const response = await createWorkspaceEntryGateway(
        'https://core.test',
        'workspace.test',
        true,
        async () =>
          Response.json({ secret: 'private' }, { status, headers: { 'Retry-After': '12' } }),
      )(request())
      expect(response.status).toBe(status)
      if (status === 429) expect(response.headers.get('retry-after')).toBe('12')
      expect(JSON.stringify(await response.json())).not.toContain('private')
    }
  })
  it('resolves only a generic host and constructs the destination locally without query/hash selectors', async () => {
    const fetcher = vi.fn(async () => Response.json({ source: 'preference', workspace }))
    expect(
      await readWorkspaceEntryBootstrap(
        request('http://workspace.test:3003/sent?redirect=https://evil.test#secret'),
        '/sent',
        'https://core.test',
        'workspace.test',
        true,
        fetcher,
      ),
    ).toEqual({ kind: 'redirect', href: 'http://northwind.workspace.test:3003/sent#' })
    fetcher.mockClear()
    expect(
      await readWorkspaceEntryBootstrap(
        request('http://acme.workspace.test:3003/sent'),
        '/sent',
        'https://core.test',
        'workspace.test',
        true,
        fetcher,
      ),
    ).toEqual({ kind: 'passthrough' })
    expect(
      await readWorkspaceEntryBootstrap(
        request('http://other-environment.test:3003/sent'),
        '/sent',
        'https://core.test',
        'workspace.test',
        true,
        fetcher,
      ),
    ).toEqual({ kind: 'invalid' })
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('does not invent workspaces or treat an expired session as an operational error', async () => {
    expect(
      await readWorkspaceEntryBootstrap(
        request(),
        '/sent',
        'https://core.test',
        'workspace.test',
        true,
        async () => Response.json({ source: 'none', workspace: null }),
      ),
    ).toEqual({ kind: 'empty' })
    expect(
      await readWorkspaceEntryBootstrap(
        request(),
        '/sent',
        'https://core.test',
        'workspace.test',
        true,
        async () => new Response(null, { status: 401 }),
      ),
    ).toEqual({ kind: 'unauthenticated' })
    expect(
      await readWorkspaceEntryBootstrap(
        request(),
        '/sent',
        'https://core.test',
        'workspace.test',
        true,
        async () => new Response(null, { status: 500 }),
      ),
    ).toEqual({ kind: 'error' })
  })
})
