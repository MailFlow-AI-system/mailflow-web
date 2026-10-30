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
    const incoming = new Request(`${origin}/api/mail/sent?offset=20&userId=other`, {
      headers: { 'X-Workspace-Id': 'workspace-a', 'X-Workspace-Identity': 'user-one' },
    })
    await createOutgoingMailProxy('https://api.example.test', fetcher)(incoming)
    expect(String(fetcher.mock.calls[0]?.[0])).toBe(
      'https://api.example.test/api/v1/mail/sent?offset=20',
    )
    const headers = new Headers(fetcher.mock.calls[0]?.[1]?.headers)
    expect(headers.get('X-Workspace-Id')).toBe('workspace-a')
    expect(headers.get('X-Workspace-Identity')).toBe('user-one')
  })
  it('blocks unsupported paths while safely reporting upstream failure', async () => {
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
      (
        await createOutgoingMailProxy(
          'https://api.example.test',
          fetcher,
        )(new Request(`${origin}/api/mail/sent`))
      ).status,
    ).toBe(502)
    const response = await createOutgoingMailProxy('https://api.example.test', fetcher)(request())
    expect(response.status).toBe(502)
    expect(await response.text()).not.toContain('private')
  })
})

it('allows fixed context and scoped mutations while workspace list UI stays disabled', async () => {
  const fetcher = vi.fn<typeof fetch>(async () => Response.json({ ok: true }))
  const proxy = createOutgoingMailProxy('https://api.example.test', fetcher)
  for (const path of ['/api/mail/context', '/api/mail/send', '/api/mail/attachments']) {
    const incoming = path.endsWith('/context')
      ? new Request(`${origin}${path}?userId=untrusted`)
      : request(path)
    incoming.headers.set('X-Workspace-Id', 'workspace-a')
    incoming.headers.set('X-Workspace-Identity', 'user-one')
    incoming.headers.set('X-User-Id', 'forged')
    incoming.headers.set('X-Forwarded-Host', 'untrusted.test')
    expect((await proxy(incoming)).status).toBe(200)
    const [url, options] = fetcher.mock.calls.at(-1) ?? []
    expect(String(url)).toBe(
      `https://api.example.test${path.replace('/api/mail/', '/api/v1/mail/')}`,
    )
    const headers = new Headers(options?.headers)
    expect(headers.get('X-Workspace-Id')).toBe('workspace-a')
    expect(headers.get('X-Workspace-Identity')).toBe('user-one')
    expect(headers.get('X-User-Id')).toBeNull()
    expect(headers.get('X-Forwarded-Host')).toBeNull()
  }
})

it.each([
  '/api/mail/context',
  '/api/mail/attachments/00000000-0000-4000-8000-000000000001',
  '/api/mail/attachments/00000000-0000-4000-8000-000000000001/download',
])('derives a missing scoped GET Origin only from its actual incoming URL (%s)', async (path) => {
  const fetcher = vi.fn<typeof fetch>(async () => Response.json({ ok: true }))
  const proxy = createOutgoingMailProxy('https://api.example.test', fetcher)
  const tenantOrigin = 'https://tenant-a.mail.example.test'
  const incoming = new Request(`${tenantOrigin}${path}`, {
    headers: { 'X-Forwarded-Host': 'tenant-b.mail.example.test', 'X-Workspace-Id': 'workspace-a' },
  })
  expect((await proxy(incoming)).status).toBe(200)
  const headers = new Headers(fetcher.mock.calls[0]?.[1]?.headers)
  expect(headers.get('Origin')).toBe(tenantOrigin)
  expect(headers.get('X-Forwarded-Host')).toBeNull()
  expect(headers.get('X-Workspace-Id')).toBe('workspace-a')
  const mismatch = new Request(`${tenantOrigin}${path}`, {
    headers: { Origin: 'https://tenant-b.mail.example.test' },
  })
  expect((await proxy(mismatch)).status).toBe(403)
  expect(fetcher).toHaveBeenCalledTimes(1)
})

it('forwards only authenticated attachment routes with the same mutation origin guard', async () => {
  const fetcher = vi.fn<typeof fetch>(async () => Response.json({ id: 'id' }))
  const proxy = createOutgoingMailProxy('https://api.example.test', fetcher)
  const id = '00000000-0000-4000-8000-000000000001'
  for (const path of ['/api/mail/attachments', `/api/mail/attachments/${id}/complete`]) {
    expect((await proxy(request(path))).status).toBe(200)
    expect((await proxy(request(path, 'https://evil.test'))).status).toBe(403)
  }
  for (const path of [`/api/mail/attachments/${id}`, `/api/mail/attachments/${id}/download`]) {
    expect((await proxy(new Request(`${origin}${path}?url=https://evil.test`))).status).toBe(200)
    expect(String(fetcher.mock.calls.at(-1)?.[0])).toBe(
      `https://api.example.test${path.replace('/api/mail/', '/api/v1/mail/')}`,
    )
  }
  const before = fetcher.mock.calls.length
  expect((await proxy(request('/api/mail/attachments/not-an-id/complete'))).status).toBe(404)
  expect((await proxy(request(`/api/mail/attachments/${id}/delete`))).status).toBe(404)
  expect(fetcher).toHaveBeenCalledTimes(before)
})

it('forwards discard only to its fixed Core path with mutation and workspace guards', async () => {
  const fetcher = vi.fn<typeof fetch>(async () =>
    Response.json({ status: 'discarded', retainedMessageIds: [] }),
  )
  const proxy = createOutgoingMailProxy('https://api.example.test', fetcher)
  const incoming = request('/api/mail/discard?url=https://evil.test')
  incoming.headers.set('X-Workspace-Id', 'workspace-a')
  incoming.headers.set('X-Workspace-Identity', 'user-one')
  expect((await proxy(incoming)).status).toBe(200)
  expect(String(fetcher.mock.calls[0]?.[0])).toBe('https://api.example.test/api/v1/mail/discard')
  const headers = new Headers(fetcher.mock.calls[0]?.[1]?.headers)
  expect(headers.get('X-Workspace-Id')).toBe('workspace-a')
  expect(headers.get('X-Workspace-Identity')).toBe('user-one')
  expect((await proxy(request('/api/mail/discard', 'https://evil.test'))).status).toBe(403)
  expect((await proxy(new Request(`${origin}/api/mail/discard`))).status).toBe(404)
  expect(fetcher).toHaveBeenCalledTimes(1)
})

it('allows workspace Sent while deriving Origin from the request host and exposing verified response scope', async () => {
  const fetcher = vi.fn<typeof fetch>(async () =>
    Response.json(
      { items: [], nextOffset: null },
      {
        headers: { 'X-Workspace-Id': 'workspace-a', 'X-Workspace-Identity': 'owner' },
      },
    ),
  )
  const proxy = createOutgoingMailProxy('https://api.example.test', fetcher)
  const response = await proxy(
    new Request(`${origin}/api/mail/sent?offset=20&workspaceId=forged`, {
      headers: {
        'X-Workspace-Id': 'workspace-a',
        'X-Workspace-Identity': 'owner',
        'X-Forwarded-Host': 'other.example.test',
      },
    }),
  )
  expect(response.status).toBe(200)
  expect(response.headers.get('X-Workspace-Id')).toBe('workspace-a')
  expect(response.headers.get('X-Workspace-Identity')).toBe('owner')
  expect(String(fetcher.mock.calls[0]?.[0])).toBe(
    'https://api.example.test/api/v1/mail/sent?offset=20',
  )
  const headers = new Headers(fetcher.mock.calls[0]?.[1]?.headers)
  expect(headers.get('Origin')).toBe(origin)
  expect(headers.get('X-Forwarded-Host')).toBeNull()
  expect(
    (
      await proxy(
        new Request(`${origin}/api/mail/sent`, { headers: { Origin: 'https://evil.test' } }),
      )
    ).status,
  ).toBe(403)
  expect(fetcher).toHaveBeenCalledTimes(1)
})

it('forwards sent detail and inline attachment bytes only through fixed authenticated paths', async () => {
  const fetcher = vi.fn<typeof fetch>(
    async () =>
      new Response('bytes', {
        headers: {
          'Content-Type': 'image/png',
          'Content-Disposition': 'inline',
          'X-Workspace-Id': 'workspace-a',
          'X-Workspace-Identity': 'user-one',
        },
      }),
  )
  const proxy = createOutgoingMailProxy('https://api.example.test', fetcher)
  for (const path of [
    '/api/mail/sent/message-1',
    '/api/mail/attachments/00000000-0000-4000-8000-000000000001/inline',
  ]) {
    const response = await proxy(
      new Request(`${origin}${path}?url=https://evil.test`, {
        headers: {
          cookie: 'analytics=discard; better-auth.session_token=opaque',
          'X-Workspace-Id': 'workspace-a',
          'X-Workspace-Identity': 'user-one',
        },
      }),
    )
    expect(response.status).toBe(200)
    expect(String(fetcher.mock.calls.at(-1)?.[0])).toBe(
      `https://api.example.test${path.replace('/api/mail/', '/api/v1/mail/')}`,
    )
    expect(new Headers(fetcher.mock.calls.at(-1)?.[1]?.headers).get('cookie')).toBe(
      'better-auth.session_token=opaque',
    )
    expect(response.headers.get('Content-Type')).toBe('image/png')
    expect(response.headers.get('X-Workspace-Identity')).toBe('user-one')
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
  }
})
