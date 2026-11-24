import { describe, expect, it, vi } from 'vitest'
import { createWorkspaceGateway } from './workspaceGateway'

describe('bounded workspace gateway', () => {
  const cookie = 'better-auth.session_token=test-session; private=value'
  it('derives the selector from a trusted URL, not forwarded host or arbitrary query', async () => {
    const fetcher = vi.fn(async () => Response.json({ workspace: { id: 'a' } }))
    const gateway = createWorkspaceGateway('https://core.test', 'workspace.test', fetcher)
    const response = await gateway(
      new Request('http://acme.workspace.test/api/workspace-context?slug=globex', {
        headers: { Cookie: cookie, 'X-Forwarded-Host': 'globex.workspace.test' },
      }),
    )
    expect(fetcher.mock.calls[0]).toMatchObject([
      new URL('https://core.test/api/v1/workspaces/acme/context'),
      {
        headers: { Cookie: 'better-auth.session_token=test-session' },
        cache: 'no-store',
        redirect: 'manual',
      },
    ])
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(response.headers.get('set-cookie')).toBeNull()
  })
  it('rejects unknown hosts, no session and non-allowlisted operations without fetching', async () => {
    const fetcher = vi.fn(async () => Response.json({}))
    const gateway = createWorkspaceGateway('https://core.test', 'workspace.test', fetcher)
    expect(
      (await gateway(new Request('http://acme.workspace.test/api/workspace-context'))).status,
    ).toBe(401)
    expect(
      (
        await gateway(
          new Request('http://workers.dev/api/workspace-context', { headers: { Cookie: cookie } }),
        )
      ).status,
    ).toBe(404)
    expect(
      (
        await gateway(
          new Request('http://acme.workspace.test/api/v1/members', { headers: { Cookie: cookie } }),
        )
      ).status,
    ).toBe(404)
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('never follows upstream redirects and sanitizes transport failures', async () => {
    const request = new Request('http://acme.workspace.test/api/workspace-context', {
      headers: { Cookie: cookie },
    })
    expect(
      (
        await createWorkspaceGateway(
          'https://core.test',
          'workspace.test',
          async () =>
            new Response(null, { status: 302, headers: { Location: 'https://attacker.test' } }),
        )(request)
      ).status,
    ).toBe(502)
    const response = await createWorkspaceGateway(
      'https://core.test',
      'workspace.test',
      async () => {
        throw new Error('secret upstream')
      },
    )(request)
    expect(await response.json()).toEqual({ code: 'workspace_upstream_unavailable' })
  })
  it('preserves authenticated identity and correlation but discards upstream cookies', async () => {
    const fetcher = vi.fn(async () =>
      Response.json(
        { workspace: null },
        {
          headers: {
            'X-Workspace-Identity': 'actor',
            'X-Request-ID': 'request-1',
            'Set-Cookie': 'private=secret',
          },
        },
      ),
    )
    const result = await createWorkspaceGateway(
      'https://core.test',
      'workspace.test',
      fetcher,
    )(
      new Request('http://acme.workspace.test/api/workspace-context', {
        headers: { Cookie: cookie, tracestate: 'vendor=value' },
      }),
    )
    expect(result.headers.get('x-workspace-identity')).toBe('actor')
    expect(result.headers.get('x-request-id')).toBe('request-1')
    expect(result.headers.get('set-cookie')).toBeNull()
    expect(fetcher.mock.calls[0]).toMatchObject([
      expect.any(URL),
      { headers: { tracestate: 'vendor=value' } },
    ])
  })
})

describe('workspace transport client IP forwarding', () => {
  const secret = 'worker-proxy-secret-0123456789abcdef'
  const request = () =>
    new Request('http://acme.workspace.test/api/workspace-context', {
      headers: {
        Cookie: 'better-auth.session_token=test-session',
        'CF-Connecting-IP': '203.0.113.27',
        'X-Real-IP': '198.51.100.66',
        'X-MailFlow-Client-IP': '192.0.2.1',
        'X-MailFlow-Proxy-Secret': 'guess',
      },
    })

  it('sends the client IP and proxy secret through the shared transport', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => Response.json({ workspace: { id: 'a' } }))
    await createWorkspaceGateway(
      'https://core.test',
      'workspace.test',
      fetcher,
      () => secret,
    )(request())
    const headers = new Headers(fetcher.mock.calls[0]?.[1]?.headers)
    expect(headers.get('x-mailflow-client-ip')).toBe('203.0.113.27')
    expect(headers.get('x-mailflow-proxy-secret')).toBe(secret)
    expect(headers.get('x-real-ip')).toBeNull()
  })

  it('sends no proxy headers without a secret', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => Response.json({ workspace: { id: 'a' } }))
    await createWorkspaceGateway('https://core.test', 'workspace.test', fetcher)(request())
    const headers = new Headers(fetcher.mock.calls[0]?.[1]?.headers)
    expect(headers.get('x-mailflow-client-ip')).toBeNull()
    expect(headers.get('x-mailflow-proxy-secret')).toBeNull()
  })
})
