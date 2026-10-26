import { describe, expect, it, vi } from 'vitest'
import { createOutgoingMailProxy } from './outgoingMailProxy'

const origin = 'https://mail.example.test'
function request(path = '/api/mail/send', requestOrigin = origin) {
  return new Request(`${origin}${path}`, {
    method: 'POST',
    headers: {
      origin: requestOrigin,
      'content-type': 'application/json',
      cookie: 'analytics=discard; better-auth.session_token=opaque',
      authorization: 'Bearer secret',
    },
    body: JSON.stringify({ id: 'id' }),
  })
}
describe('outgoing mail proxy', () => {
  it('streams to fixed Core paths with only allowed cookies and headers', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => Response.json({ status: 'sent' }))
    const response = await createOutgoingMailProxy('https://api.example.test', fetcher)(request())
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    const [url, init] = fetcher.mock.calls[0] ?? []
    expect(String(url)).toBe('https://api.example.test/api/v1/mail/send')
    expect(new Headers(init?.headers).get('cookie')).toBe('better-auth.session_token=opaque')
    expect(new Headers(init?.headers).get('authorization')).toBeNull()
    expect(new Headers(init?.headers).get('origin')).toBe(origin)
  })
  it('rejects cross-origin requests and non-JSON sends before forwarding', async () => {
    const fetcher = vi.fn<typeof fetch>()
    const proxy = createOutgoingMailProxy('https://api.example.test', fetcher)
    expect((await proxy(request('/api/mail/send', 'https://evil.test'))).status).toBe(403)
    const form = new Request(`${origin}/api/mail/send`, {
      method: 'POST',
      headers: { origin },
      body: 'hello',
    })
    expect((await proxy(form)).status).toBe(415)
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('forwards only the sent pagination parameter', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => Response.json({ items: [] }))
    await createOutgoingMailProxy(
      'https://api.example.test',
      fetcher,
    )(new Request(`${origin}/api/mail/sent?offset=20&userId=other`))
    expect(String(fetcher.mock.calls[0]?.[0])).toBe(
      'https://api.example.test/api/v1/mail/sent?offset=20',
    )
  })
  it('blocks unsupported paths, workspace mode and safely reports upstream failure', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => {
      throw new Error('private')
    })
    expect(
      (
        await createOutgoingMailProxy(
          'https://api.example.test',
          fetcher,
        )(request('/api/mail/evil'))
      ).status,
    ).toBe(404)
    expect(
      (await createOutgoingMailProxy('https://api.example.test', fetcher, true)(request())).status,
    ).toBe(503)
    const response = await createOutgoingMailProxy('https://api.example.test', fetcher)(request())
    expect(response.status).toBe(502)
    expect(await response.text()).not.toContain('private')
  })
})
