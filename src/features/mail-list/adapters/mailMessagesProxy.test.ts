import { describe, expect, it, vi } from 'vitest'

import { createMailMessagesProxyHandler } from './mailMessagesProxy'

const webOrigin = 'http://acme.workspace.test'
const apiOrigin = 'https://api.example.test'

describe('createMailMessagesProxyHandler', () => {
  it.each(['http://workspace.test', 'https://evil.test', 'http://a.b.workspace.test'])(
    'rejects non-tenant host %s',
    async (origin) => {
      const fetcher = vi.fn()
      const response = await createMailMessagesProxyHandler(
        apiOrigin,
        fetcher,
        'workspace.test',
      )(new Request(`${origin}/api/mail/messages`))
      expect(response.status).toBe(404)
      expect(fetcher).not.toHaveBeenCalled()
    },
  )

  it('forwards only the fixed messages path, normalized query, auth cookies, and trace context', async () => {
    let upstreamUrl: URL | undefined
    let upstreamInit: RequestInit | undefined
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      upstreamUrl = new URL(String(input))
      upstreamInit = init
      return Response.json({ items: [], nextCursor: null })
    })
    const request = new Request(`${webOrigin}/api/mail/messages?q=%20invoice%20&cursor=next`, {
      headers: {
        Cookie: 'analytics=discard; __Secure-better-auth.session_token=opaque',
        traceparent: '00-11111111111111111111111111111111-2222222222222222-01',
        tracestate: 'vendor=value',
        Authorization: 'Bearer unrelated-token',
        'X-Workspace-Identity': 'user-1',
        'X-Real-IP': 'untrusted',
        'X-Workspace-Slug': 'other',
        'X-Internal-Secret': 'unrelated-secret',
      },
    })

    const response = await createMailMessagesProxyHandler(
      apiOrigin,
      fetcher,
      'workspace.test',
    )(request)

    expect(response.status).toBe(200)
    expect(upstreamUrl?.origin).toBe(apiOrigin)
    expect(upstreamUrl?.pathname).toBe('/api/v1/workspaces/acme/mail/messages')
    expect(upstreamUrl?.searchParams.get('q')).toBe('invoice')
    expect(upstreamUrl?.searchParams.get('cursor')).toBe('next')
    const headers = new Headers(upstreamInit?.headers)
    expect(headers.get('cookie')).toBe('__Secure-better-auth.session_token=opaque')
    expect(headers.get('traceparent')).toBe(
      '00-11111111111111111111111111111111-2222222222222222-01',
    )
    expect(headers.get('tracestate')).toBe('vendor=value')
    expect(headers.get('authorization')).toBeNull()
    expect(headers.get('X-Real-IP')).toBeNull()
    expect(headers.get('X-Workspace-Slug')).toBeNull()
    expect(headers.get('X-Workspace-Identity')).toBe('user-1')
    expect(headers.get('x-internal-secret')).toBeNull()
    expect(upstreamInit?.cache).toBe('no-store')
    expect(upstreamInit?.signal).toBeInstanceOf(AbortSignal)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })

  it('rejects other paths and methods without contacting Core', async () => {
    const fetcher = vi.fn(async () => Response.json({ items: [], nextCursor: null }))
    const proxy = createMailMessagesProxyHandler(apiOrigin, fetcher, 'workspace.test')

    const wrongPath = await proxy(new Request(`${webOrigin}/api/mail/other`))
    const wrongMethod = await proxy(
      new Request(`${webOrigin}/api/mail/messages`, { method: 'POST' }),
    )

    expect(wrongPath.status).toBe(404)
    expect(wrongMethod.status).toBe(404)
    expect(wrongPath.headers.get('cache-control')).toBe('private, no-store')
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('returns a generic private gateway error when Core cannot be reached', async () => {
    const fetcher = vi.fn(async () => {
      throw new Error('sensitive upstream detail')
    })

    const response = await createMailMessagesProxyHandler(
      apiOrigin,
      fetcher,
      'workspace.test',
    )(
      new Request(`${webOrigin}/api/mail/messages`, {
        headers: { Cookie: 'better-auth.session_token=opaque' },
      }),
    )
    const body = await response.json()

    expect(response.status).toBe(502)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(body).toEqual({
      code: 'MAIL_MESSAGES_UPSTREAM_UNAVAILABLE',
      message: 'Messages are temporarily unavailable.',
    })
    expect(JSON.stringify(body)).not.toContain('sensitive upstream detail')
  })
})
