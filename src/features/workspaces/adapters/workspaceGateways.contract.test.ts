import { afterEach, describe, expect, it, vi } from 'vitest'
import { createWorkspaceEntryGateway } from './workspaceEntryGateway'
import { createWorkspaceGateway } from './workspaceGateway'
import { createWorkspaceSelectionGateway } from './workspaceSelectionGateway'

const workspace = { id: 'b', name: 'Northwind', slug: 'northwind', role: 'member' }
const operations = [
  {
    name: 'discovery',
    path: 'http://acme.workspace.test/api/v1/workspaces',
    create: (fetcher: typeof fetch) =>
      createWorkspaceGateway('https://core.test', 'workspace.test', fetcher),
    payload: { workspaces: [workspace], nextCursor: null },
    identity: true,
    method: 'GET',
  },
  {
    name: 'selection',
    path: 'http://acme.workspace.test/api/v1/workspace-selection',
    create: (fetcher: typeof fetch) =>
      createWorkspaceSelectionGateway('https://core.test', 'workspace.test', true, fetcher),
    payload: { workspace },
    identity: true,
    method: 'POST',
  },
  {
    name: 'entry',
    path: 'http://workspace.test/api/v1/workspace-entry',
    create: (fetcher: typeof fetch) =>
      createWorkspaceEntryGateway('https://core.test', 'workspace.test', true, fetcher),
    payload: { source: 'preference', workspace },
    identity: false,
    method: 'GET',
  },
] as const

afterEach(() => vi.restoreAllMocks())

describe.each(operations)('$name forwarding contract', (operation) => {
  function request(signal?: AbortSignal) {
    return new Request(operation.path, {
      method: operation.method,
      signal,
      headers: {
        Cookie: 'better-auth.session_token=synthetic; analytics=private',
        Origin: new URL(operation.path).origin,
        'Content-Type': 'application/json',
        'X-Workspace-Identity': 'actor',
        traceparent: '00-11111111111111111111111111111111-2222222222222222-01',
        tracestate: 'vendor=value',
        Authorization: 'private',
        'X-Forwarded-Host': 'evil.test',
      },
      ...(operation.method === 'POST' ? { body: JSON.stringify({ workspaceId: 'b' }) } : {}),
    })
  }

  it('forwards only allowed credentials and tracing, with operation-specific identity', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => Response.json(operation.payload))
    const response = await operation.create(fetcher)(request())
    expect(response.status).toBe(200)
    const [, init] = fetcher.mock.calls[0]
    const headers = new Headers(init?.headers)
    expect(headers.get('cookie')).toBe('better-auth.session_token=synthetic')
    expect(headers.get('traceparent')).toBe(request().headers.get('traceparent'))
    expect(headers.get('tracestate')).toBe('vendor=value')
    expect(headers.get('x-workspace-identity')).toBe(operation.identity ? 'actor' : null)
    expect(headers.get('authorization')).toBeNull()
    expect(headers.get('x-forwarded-host')).toBeNull()
    expect(headers.get('origin')).toBe(
      operation.method === 'POST' ? new URL(operation.path).origin : null,
    )
    expect(init?.cache).toBe('no-store')
    expect(init?.redirect).toBe('manual')
  })

  it('filters upstream headers while preserving safe correlation and retry hints', async () => {
    const response = await operation.create(async () =>
      Response.json(
        { private: 'upstream details' },
        {
          status: 429,
          headers: {
            'Set-Cookie': 'private=secret',
            Location: 'https://evil.test',
            'X-Private': 'secret',
            'Cache-Control': 'public, max-age=3600',
            'X-Request-ID': 'correlation',
            'X-Workspace-Identity': 'actor',
            'Retry-After': '12',
          },
        },
      ),
    )(request())
    expect(response.status).toBe(429)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(response.headers.get('x-request-id')).toBe('correlation')
    expect(response.headers.get('x-workspace-identity')).toBe(operation.identity ? 'actor' : null)
    expect(response.headers.get('retry-after')).toBe('12')
    for (const name of ['set-cookie', 'location', 'x-private'])
      expect(response.headers.get(name)).toBeNull()
  })

  it.each(['request', 'deadline'] as const)(
    'aborts upstream on %s cancellation without exposing errors',
    async (source) => {
      const controller = new AbortController()
      const deadline = new AbortController()
      vi.spyOn(AbortSignal, 'timeout').mockReturnValue(deadline.signal)
      const fetcher = vi.fn<typeof fetch>(
        async (_url, init) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener(
              'abort',
              () => reject(new Error('private transport failure')),
              { once: true },
            )
          }),
      )
      const pending = operation.create(fetcher)(request(controller.signal))
      await vi.waitFor(() => expect(fetcher).toHaveBeenCalledOnce())
      if (source === 'request') controller.abort()
      else deadline.abort()
      const response = await pending
      expect(response.status).toBe(502)
      expect(await response.text()).not.toContain('private transport failure')
      expect(response.headers.get('cache-control')).toBe('private, no-store')
    },
  )
})

it('preserves discovery 503 while sanitizing operational entry/selection failures', async () => {
  for (const operation of operations) {
    const request = new Request(operation.path, {
      method: operation.method,
      headers: {
        Cookie: 'better-auth.session_token=synthetic',
        Origin: new URL(operation.path).origin,
        'Content-Type': 'application/json',
      },
      ...(operation.method === 'POST' ? { body: JSON.stringify({ workspaceId: 'b' }) } : {}),
    })
    const response = await operation.create(async () =>
      Response.json({ code: 'unavailable' }, { status: 503 }),
    )(request)
    expect(response.status).toBe(operation.name === 'discovery' ? 503 : 502)
  }
})
