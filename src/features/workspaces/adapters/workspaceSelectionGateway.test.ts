import { describe, expect, it, vi } from 'vitest'
import { createWorkspaceSelectionGateway } from './workspaceSelectionGateway'

const origin = 'http://acme.workspace.test:3003'
const target = { id: 'b', name: 'Northwind', slug: 'northwind', role: 'member' }
function request(body: unknown = { workspaceId: 'b' }, source = origin, requestOrigin = origin) {
  return new Request(`${source}/api/v1/workspace-selection`, {
    method: 'POST',
    headers: {
      Origin: requestOrigin,
      'Content-Type': 'application/json',
      Cookie: 'analytics=ignore; better-auth.session_token=opaque',
    },
    body: JSON.stringify(body),
  })
}
describe('selection gateway', () => {
  it('proxies the bounded selector and auth cookie, with exact origin and no client authority', async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      Response.json(
        { workspace: target },
        { headers: { 'Set-Cookie': 'unrelated=discard', 'X-Request-ID': 'request-selection-1' } },
      ),
    )
    const response = await createWorkspaceSelectionGateway(
      'http://127.0.0.1:8083',
      'workspace.test',
      true,
      fetcher,
    )(request())
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ workspace: target })
    const [url, init] = fetcher.mock.calls[0]
    expect(String(url)).toBe('http://127.0.0.1:8083/api/v1/workspace-selection')
    expect(new Headers(init?.headers).get('cookie')).toBe('better-auth.session_token=opaque')
    expect(new Headers(init?.headers).get('origin')).toBe(origin)
    expect(init?.redirect).toBe('manual')
    expect(init?.body).toBe('{"workspaceId":"b"}')
    expect(response.headers.get('x-request-id')).toBe('request-selection-1')
    expect(response.headers.get('set-cookie')).toBeNull()
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })
  it.each(['null', 'http://northwind.workspace.test:3003', 'https://evil.example'])(
    'rejects foreign origin %s without fetching',
    async (requestOrigin) => {
      const fetcher = vi.fn()
      const response = await createWorkspaceSelectionGateway(
        'http://api.test',
        'workspace.test',
        true,
        fetcher,
      )(request(undefined, origin, requestOrigin))
      expect(response.status).toBe(403)
      expect(fetcher).not.toHaveBeenCalled()
    },
  )
  it('rejects unknown hosts, missing cookies, large bodies and forged fields', async () => {
    const fetcher = vi.fn()
    const gateway = createWorkspaceSelectionGateway(
      'http://api.test',
      'workspace.test',
      true,
      fetcher,
    )
    expect((await gateway(request(undefined, 'http://evil.example'))).status).toBe(404)
    const anonymous = request()
    anonymous.headers.delete('cookie')
    expect((await gateway(anonymous)).status).toBe(401)
    expect((await gateway(request({ workspaceId: 'b', userId: 'other' }))).status).toBe(400)
    expect((await gateway(request({ workspaceId: 'x'.repeat(2000) }))).status).toBe(413)
    const malformed = new Request(`${origin}/api/v1/workspace-selection`, {
      method: 'POST',
      headers: request().headers,
      body: '{invalid',
    })
    expect((await gateway(malformed)).status).toBe(400)
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('stays disabled outside the explicitly enabled local test zone', async () => {
    const fetcher = vi.fn()
    expect(
      (
        await createWorkspaceSelectionGateway(
          'http://api.test',
          'workspace.test',
          false,
          fetcher,
        )(request())
      ).status,
    ).toBe(503)
    expect(
      (
        await createWorkspaceSelectionGateway(
          'http://api.test',
          'production.example',
          true,
          fetcher,
        )(request())
      ).status,
    ).toBe(503)
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('never forwards redirects, operational details or inconsistent workspace results', async () => {
    for (const upstream of [
      new Response(null, { status: 302, headers: { Location: 'https://evil.test' } }),
      Response.json({ detail: 'secret' }, { status: 500 }),
      Response.json({ workspace: { ...target, id: 'c' } }),
    ]) {
      const response = await createWorkspaceSelectionGateway(
        'http://api.test',
        'workspace.test',
        true,
        vi.fn(async () => upstream),
      )(request())
      expect(response.status).toBe(502)
      expect(await response.text()).not.toContain('secret')
      expect(response.headers.get('location')).toBeNull()
    }
  })
})
