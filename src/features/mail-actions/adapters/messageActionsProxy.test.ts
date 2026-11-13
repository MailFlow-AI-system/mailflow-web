import { describe, expect, it, vi } from 'vitest'
import { createMessageActionsProxy } from './messageActionsProxy'

const webOrigin = 'http://acme.workspace.test'
const apiOrigin = 'https://api.example.test'
const body = JSON.stringify({ ids: ['m1'], action: 'archive' })
const request = (init: RequestInit & { headers?: Record<string, string> } = {}) =>
  new Request(`${webOrigin}/api/mail/messages/actions`, {
    method: 'POST',
    body,
    ...init,
    headers: {
      Cookie: 'better-auth.session_token=opaque',
      Origin: webOrigin,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })

describe('createMessageActionsProxy', () => {
  it('forwards a same-origin JSON action to the workspace endpoint', async () => {
    let upstreamUrl: URL | undefined
    let upstreamBody = ''
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      upstreamUrl = new URL(String(input))
      upstreamBody = await new Response(init?.body).text()
      return Response.json({ results: [{ id: 'm1', status: 'ok' }] })
    })

    const response = await createMessageActionsProxy(
      apiOrigin,
      fetcher,
      'workspace.test',
    )(request())

    expect(response.status).toBe(200)
    expect(upstreamUrl?.href).toBe(`${apiOrigin}/api/v1/workspaces/acme/mail/messages/actions`)
    expect(JSON.parse(upstreamBody)).toEqual({ ids: ['m1'], action: 'archive' })
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })

  it.each([
    ['a cross-origin request', { headers: { Origin: 'https://evil.test' } }, 403],
    ['a missing origin', { headers: { Origin: '' } }, 403],
    ['a cross-site fetch', { headers: { 'Sec-Fetch-Site': 'cross-site' } }, 403],
    ['a non-JSON body', { headers: { 'Content-Type': 'text/plain' } }, 415],
    ['another method', { method: 'PUT' }, 404],
  ] as const)('rejects %s without contacting Core', async (_name, init, status) => {
    const fetcher = vi.fn()
    const response = await createMessageActionsProxy(
      apiOrigin,
      fetcher,
      'workspace.test',
    )(request(init as RequestInit & { headers?: Record<string, string> }))
    expect(response.status).toBe(status)
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('requires a workspace host and a session cookie', async () => {
    const fetcher = vi.fn()
    const proxy = createMessageActionsProxy(apiOrigin, fetcher, 'workspace.test')
    const bare = await proxy(
      new Request('http://workspace.test/api/mail/messages/actions', {
        method: 'POST',
        body,
        headers: { Origin: 'http://workspace.test', 'Content-Type': 'application/json' },
      }),
    )
    const anonymous = await proxy(request({ headers: { Cookie: 'analytics=1' } }))
    expect(bare.status).toBe(404)
    expect(anonymous.status).toBe(401)
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('hides upstream failures behind a generic gateway error', async () => {
    const fetcher = vi.fn(async () => {
      throw new Error('secret detail')
    })
    const response = await createMessageActionsProxy(
      apiOrigin,
      fetcher,
      'workspace.test',
    )(request())
    expect(response.status).toBe(502)
    expect(await response.text()).not.toContain('secret detail')
  })
})
