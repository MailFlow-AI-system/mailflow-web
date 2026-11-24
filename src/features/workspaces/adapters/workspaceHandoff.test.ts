import { describe, expect, it, vi } from 'vitest'
import { createWorkspaceHandoffHandler } from './workspaceHandoff'

const code = 'A'.repeat(43)
const api = 'https://api.example.com'
const sessionCookie =
  '__Secure-better-auth.session_token=signed; Path=/; HttpOnly; Secure; SameSite=Lax'

function setup(response: Response | Error = new Response('{"status":true}')) {
  const fetcher = vi.fn(async () => {
    if (response instanceof Error) throw response
    return response
  })
  const handle = createWorkspaceHandoffHandler(api, 'example.com', true, fetcher)
  return { fetcher, handle }
}

describe('workspace handoff route', () => {
  it('exchanges the code on its own host and redirects to the inbox with a host-only session', async () => {
    const upstream = new Response('{"status":true}', {
      headers: { 'Content-Type': 'application/json', 'Set-Cookie': sessionCookie },
    })
    const { fetcher, handle } = setup(upstream)
    const response = await handle(
      new Request(`https://acme.example.com/auth/handoff?code=${code}`, {
        headers: { Cookie: '__Secure-better-auth.session_token=stale' },
      }),
    )
    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe('/inbox')
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(response.headers.get('referrer-policy')).toBe('no-referrer')
    expect(response.headers.getSetCookie()).toEqual([sessionCookie])
    const [url, init] = fetcher.mock.calls[0] as unknown as [URL, RequestInit]
    expect(url.href).toBe(`${api}/api/auth/workspace-handoff/exchange`)
    expect(init.method).toBe('POST')
    expect(init.redirect).toBe('manual')
    expect(new Headers(init.headers).get('origin')).toBe('https://acme.example.com')
    // A stale session from this host must not influence the exchange.
    expect(new Headers(init.headers).get('cookie')).toBeNull()
    expect(JSON.parse(String(init.body))).toEqual({ code })
  })

  it.each([
    [new Response('{"code":"WORKSPACE_HANDOFF_INVALID"}', { status: 400 })],
    [new Response(null, { status: 429 })],
    [new Response(null, { status: 502 })],
    [new TypeError('network')],
  ])('sends a rejected or failed exchange to the login page without cookies', async (upstream) => {
    const { handle } = setup(upstream)
    const response = await handle(new Request(`https://acme.example.com/auth/handoff?code=${code}`))
    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe('/login?handoff=expired')
    expect(response.headers.getSetCookie()).toEqual([])
  })

  it.each([
    'https://acme.example.com/auth/handoff',
    'https://acme.example.com/auth/handoff?code=short',
    `https://acme.example.com/auth/handoff?code=${code}&code=${code}`,
  ])('rejects malformed codes without calling Core (%s)', async (url) => {
    const { fetcher, handle } = setup()
    const response = await handle(new Request(url))
    expect(response.headers.get('location')).toBe('/login?handoff=expired')
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('serves handoffs only on workspace hosts and only when workspace hosting is enabled', async () => {
    const { fetcher, handle } = setup()
    for (const url of [
      `https://example.com/auth/handoff?code=${code}`,
      `https://app.example.com/auth/handoff?code=${code}`,
      `http://acme.example.com/auth/handoff?code=${code}`,
    ])
      expect((await handle(new Request(url))).status).toBe(404)
    const disabled = createWorkspaceHandoffHandler(api, 'example.com', false, fetcher)
    expect(
      (await disabled(new Request(`https://acme.example.com/auth/handoff?code=${code}`))).status,
    ).toBe(404)
    expect(fetcher).not.toHaveBeenCalled()
  })
})
