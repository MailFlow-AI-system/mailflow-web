import { describe, expect, it, vi } from 'vitest'

import { createAuthProxyHandler } from './authProxy'

const apiBaseUrl = 'https://mailflow-core-api.up.railway.app'

describe('createAuthProxyHandler', () => {
  it('forwards the email sign-in path, query, credentials, trace context, and body', async () => {
    let forwardedInput: RequestInfo | URL | undefined
    let forwardedInit: RequestInit | undefined
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      forwardedInput = input
      forwardedInit = init
      return Response.json({ user: { id: 'user-1' } })
    })
    const requestBody = JSON.stringify({ email: 'ada@example.test', password: 'password' })
    const request = new Request(
      'https://mailflow-web.workers.dev/api/auth/sign-in/email?callbackURL=%2Fapp',
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Cookie: 'analytics=discard; __Secure-better-auth.session_token=opaque',
          Origin: 'https://mailflow-web.workers.dev',
          Referer: 'https://mailflow-web.workers.dev/login?email=private@example.test',
          Authorization: 'Bearer unrelated-token',
          'X-Internal-Secret': 'unrelated-secret',
          traceparent: '00-11111111111111111111111111111111-2222222222222222-01',
          tracestate: 'vendor=value',
        },
        body: requestBody,
      },
    )

    const response = await createAuthProxyHandler(apiBaseUrl, fetcher)(request)

    expect(response.status).toBe(200)
    expect(String(forwardedInput)).toBe(
      'https://mailflow-core-api.up.railway.app/api/auth/sign-in/email?callbackURL=%2Fapp',
    )
    expect(forwardedInit?.method).toBe('POST')
    const forwardedHeaders = new Headers(forwardedInit?.headers)
    expect(forwardedHeaders.get('cookie')).toBe('__Secure-better-auth.session_token=opaque')
    expect(forwardedHeaders.get('origin')).toBe('https://mailflow-web.workers.dev')
    expect(forwardedHeaders.get('referer')).toBe('https://mailflow-web.workers.dev')
    expect(forwardedHeaders.get('authorization')).toBeNull()
    expect(forwardedHeaders.get('x-internal-secret')).toBeNull()
    expect(forwardedHeaders.get('traceparent')).toBe(
      '00-11111111111111111111111111111111-2222222222222222-01',
    )
    expect(forwardedHeaders.get('tracestate')).toBe('vendor=value')
    await expect(new Response(forwardedInit?.body ?? null).text()).resolves.toBe(requestBody)
    expect(forwardedInit?.cache).toBe('no-store')
    expect(fetcher).toHaveBeenCalledOnce()
  })

  it('preserves redirects and every Set-Cookie header for the Web origin', async () => {
    const upstreamHeaders = new Headers({
      Location: 'https://mailflow-web.workers.dev/app',
    })
    upstreamHeaders.append(
      'Set-Cookie',
      'better-auth.session_token=opaque; Path=/; HttpOnly; Secure; SameSite=Lax',
    )
    upstreamHeaders.append('Set-Cookie', 'better-auth.session_data=cache; Path=/; HttpOnly; Secure')
    const upstreamResponse = new Response(null, { status: 302, headers: upstreamHeaders })
    let forwardedInit: RequestInit | undefined
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      forwardedInit = init
      return upstreamResponse
    })
    const request = new Request('https://mailflow-web.workers.dev/api/auth/sign-in/email', {
      method: 'POST',
      body: '{}',
    })

    const response = await createAuthProxyHandler(apiBaseUrl, fetcher)(request)

    expect(response.status).toBe(302)
    expect(forwardedInit?.redirect).toBe('manual')
    expect(response.headers.get('location')).toBe('https://mailflow-web.workers.dev/app')
    expect(response.headers.getSetCookie()).toEqual([
      'better-auth.session_token=opaque; Path=/; HttpOnly; Secure; SameSite=Lax',
      'better-auth.session_data=cache; Path=/; HttpOnly; Secure',
    ])
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })

  it('returns authentication errors from Core unchanged', async () => {
    const fetcher = vi.fn(async () =>
      Response.json({ code: 'INVALID_EMAIL_OR_PASSWORD' }, { status: 401 }),
    )
    const request = new Request('https://mailflow-web.workers.dev/api/auth/sign-in/email', {
      method: 'POST',
      body: '{}',
    })

    const response = await createAuthProxyHandler(apiBaseUrl, fetcher)(request)

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ code: 'INVALID_EMAIL_OR_PASSWORD' })
  })

  it('drops an invalid Referer instead of forwarding it to Core', async () => {
    let forwardedInit: RequestInit | undefined
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      forwardedInit = init
      return Response.json(null)
    })
    const request = new Request('https://mailflow-web.workers.dev/api/auth/sign-in/email', {
      method: 'POST',
      headers: { Referer: 'not a URL' },
      body: '{}',
    })

    await createAuthProxyHandler(apiBaseUrl, fetcher)(request)

    expect(new Headers(forwardedInit?.headers).get('referer')).toBeNull()
  })

  it('returns a generic gateway error when Core is unreachable', async () => {
    const fetcher = vi.fn(async () => {
      throw new Error('sensitive upstream detail')
    })
    const request = new Request('https://mailflow-web.workers.dev/api/auth/get-session')

    const response = await createAuthProxyHandler(apiBaseUrl, fetcher)(request)

    expect(response.status).toBe(502)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    const body = await response.json()
    expect(body).toEqual({
      code: 'AUTH_UPSTREAM_UNAVAILABLE',
      message: 'Authentication is temporarily unavailable.',
    })
    expect(JSON.stringify(body)).not.toContain('sensitive upstream detail')
  })

  it('does not proxy signup or unsupported Better Auth paths and methods', async () => {
    const fetcher = vi.fn(async () => Response.json({ ok: true }))
    const proxy = createAuthProxyHandler(apiBaseUrl, fetcher)

    const signup = await proxy(
      new Request('https://mailflow-web.workers.dev/api/auth/sign-up/email', {
        method: 'POST',
        body: '{}',
      }),
    )
    const unknownPath = await proxy(
      new Request('https://mailflow-web.workers.dev/api/auth/delete-user', { method: 'POST' }),
    )
    const unsupportedMethod = await proxy(
      new Request('https://mailflow-web.workers.dev/api/auth/sign-in/email'),
    )

    expect(signup.status).toBe(404)
    expect(unknownPath.status).toBe(404)
    expect(unsupportedMethod.status).toBe(404)
    expect(fetcher).not.toHaveBeenCalled()
  })

  it.each([
    ['GET', '/api/auth/get-session'],
    ['POST', '/api/auth/sign-out'],
  ])('proxies the supported %s %s operation', async (method, path) => {
    let forwardedInput: RequestInfo | URL | undefined
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      forwardedInput = input
      return Response.json({ session: null })
    })
    const request = new Request(`https://mailflow-web.workers.dev${path}`, { method })

    const response = await createAuthProxyHandler(apiBaseUrl, fetcher)(request)

    expect(response.status).toBe(200)
    expect(String(forwardedInput)).toBe(`${apiBaseUrl}${path}`)
  })
})
