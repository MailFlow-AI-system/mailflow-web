import { describe, expect, it, vi } from 'vitest'
import { readWorkspaceAccess } from './workspaceAccess'

const api = 'https://api.example.com'
const cookie = '__Secure-better-auth.session_token=signed; analytics=private'

function read(url: string, upstream: Response | Error, enabled = true) {
  const fetcher = vi.fn(async () => {
    if (upstream instanceof Error) throw upstream
    return upstream
  })
  const request = new Request(url, { headers: { Cookie: cookie } })
  return { fetcher, result: readWorkspaceAccess(request, api, 'example.com', enabled, fetcher) }
}

describe('workspace access on the request host', () => {
  it('checks membership of the host workspace through Core', async () => {
    const { fetcher, result } = read(
      'https://acme.example.com/inbox',
      Response.json({ workspace: { id: 'a' } }),
    )
    expect(await result).toEqual({ kind: 'passthrough' })
    const [url, init] = fetcher.mock.calls[0] as unknown as [URL, RequestInit]
    expect(url.href).toBe(`${api}/api/v1/workspaces/acme/context`)
    expect(new Headers(init.headers).get('cookie')).toBe(
      '__Secure-better-auth.session_token=signed',
    )
  })
  it.each([404, 403])(
    'reports %s as no access without revealing whether the workspace exists',
    async (status) => {
      const { result } = read('https://acme.example.com/inbox', new Response(null, { status }))
      expect(await result).toEqual({ kind: 'forbidden' })
    },
  )
  it('asks for a new sign-in when Core no longer recognizes the session', async () => {
    const { result } = read('https://acme.example.com/inbox', new Response(null, { status: 401 }))
    expect(await result).toEqual({ kind: 'unauthenticated' })
  })
  it.each([new Response(null, { status: 503 }), new TypeError('network')])(
    'reports operational failures as retryable errors',
    async (upstream) => {
      const { result } = read('https://acme.example.com/inbox', upstream)
      expect(await result).toEqual({ kind: 'error' })
    },
  )
  it('passes through when workspace hosting is disabled and rejects non-workspace hosts', async () => {
    const disabled = read('https://acme.example.com/inbox', Response.json({}), false)
    expect(await disabled.result).toEqual({ kind: 'passthrough' })
    expect(disabled.fetcher).not.toHaveBeenCalled()
    const generic = read('https://example.com/inbox', Response.json({}))
    expect(await generic.result).toEqual({ kind: 'invalid' })
    expect(generic.fetcher).not.toHaveBeenCalled()
  })
})
