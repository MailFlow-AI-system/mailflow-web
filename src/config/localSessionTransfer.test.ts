import { expect, it, vi } from 'vitest'
import { createLocalSessionBroker } from './localSessionTransfer'

const root = 'http://localhost:3000'
const tenant = 'http://acme.localhost:3000'
const documentRequest = (url: string, cookie = '') =>
  new Request(url, { headers: { Cookie: cookie, Accept: 'text/html' } })
function location(response: Response | undefined) {
  const value = response?.headers.get('location')
  if (!value) throw new Error('Expected a redirect location')
  return value
}
function cookie(response: Response | undefined, prefix: string) {
  const value = response?.headers
    .getSetCookie()
    .find((value) => value.startsWith(prefix))
    ?.split(';')[0]
  if (!value) throw new Error('Expected a cookie')
  return value
}
async function join(
  broker: ReturnType<typeof createLocalSessionBroker>,
  rootCookie: string,
  destination = `${tenant}/inbox`,
) {
  const begin = broker.handle(
    documentRequest(
      `${root}/__local/session/join?to=${encodeURIComponent(destination)}`,
      rootCookie,
    ),
  ).response
  const receive = broker.handle(documentRequest(location(begin))).response
  const nonce = cookie(receive, 'mailflow.local_transfer.')
  const authorize = broker.handle(documentRequest(location(receive), rootCookie)).response
  const consumeUrl = location(authorize)
  const consume = broker.handle(documentRequest(consumeUrl, nonce)).response
  return { nonce, consumeUrl, consume, tenantCookie: cookie(consume, 'mailflow.local_session=') }
}
it('keeps real auth on the dev server, sharing a host-only HttpOnly browser binding', () => {
  const broker = createLocalSessionBroker()
  const initial = broker.handle(documentRequest(`${root}/login`))
  const binding = initial.setCookies[0].split(';')[0]
  expect(initial.setCookies[0]).toContain('HttpOnly')
  expect(initial.setCookies[0]).not.toContain('Domain=')
  expect(initial.capture(['better-auth.session_token=signed; HttpOnly; Path=/'])).toEqual([])
  expect(broker.handle(documentRequest(`${root}/inbox`, binding)).forwardCookie).toBe(
    'better-auth.session_token=signed',
  )
})
it('joins another host through a recipient challenge and root browser authorization, once', async () => {
  const broker = createLocalSessionBroker()
  const initial = broker.handle(documentRequest(`${root}/login`))
  const binding = initial.setCookies[0].split(';')[0]
  initial.capture(['better-auth.session_token=signed; HttpOnly'])
  const result = await join(broker, binding)
  expect(result.consume?.status).toBe(303)
  expect(location(result.consume)).toBe(`${tenant}/inbox#`)
  expect(result.consume?.headers.get('referrer-policy')).toBe('no-referrer')
  expect(result.consume?.headers.getSetCookie().join(';')).not.toContain('Domain=')
  expect(result.tenantCookie).toBe(binding)
  expect(broker.handle(documentRequest(result.consumeUrl, result.nonce)).response?.status).toBe(403)
  expect(broker.handle(documentRequest(`${tenant}/inbox`, binding)).forwardCookie).toBe(
    'better-auth.session_token=signed',
  )
})
it('shares logout and identity changes while ignoring stale browser auth cookies', async () => {
  const broker = createLocalSessionBroker()
  const initial = broker.handle(documentRequest(`${root}/login`))
  const binding = initial.setCookies[0].split(';')[0]
  initial.capture(['better-auth.session_token=first; HttpOnly'])
  await join(broker, binding)
  const second = broker.handle(documentRequest(`${tenant}/api/auth/sign-out`, binding))
  second.capture(['better-auth.session_token=; Max-Age=0'])
  expect(
    broker.handle(documentRequest(`${root}/inbox`, `${binding}; better-auth.session_token=stale`))
      .forwardCookie,
  ).toBe('')
  second.capture(['better-auth.session_token=second; HttpOnly'])
  expect(broker.handle(documentRequest(`${root}/inbox`, binding)).forwardCookie).toBe(
    'better-auth.session_token=second',
  )
})
it('rejects forged source bindings, missing recipient challenges, replay and foreign hosts', () => {
  const broker = createLocalSessionBroker()
  const initial = broker.handle(documentRequest(`${root}/login`))
  const binding = initial.setCookies[0].split(';')[0]
  const start = broker.handle(
    documentRequest(
      `${root}/__local/session/join?to=${encodeURIComponent(`${tenant}/sent`)}`,
      binding,
    ),
  ).response
  const receive = broker.handle(documentRequest(location(start))).response
  const authorizeUrl = location(receive)
  const id = new URL(authorizeUrl).searchParams.get('id')
  const consumeUrl = `${tenant}/__local/session/consume?id=${id}`
  const nonce = cookie(receive, 'mailflow.local_transfer.')
  expect(broker.handle(documentRequest(consumeUrl, nonce)).response?.status).toBe(403)
  expect(
    broker.handle(documentRequest(authorizeUrl, 'mailflow.local_session=forged')).response?.status,
  ).toBe(403)
  const authorize = broker.handle(documentRequest(authorizeUrl, binding)).response
  expect(broker.handle(documentRequest(location(authorize))).response?.status).toBe(403)
  expect(
    broker.handle(
      documentRequest(location(authorize).replace('acme.localhost', 'evil.localhost'), nonce),
    ).response?.status,
  ).toBe(403)
  expect(broker.handle(documentRequest(location(authorize), nonce)).response?.status).toBe(303)
  for (const destination of [
    'https://acme.localhost:3000/inbox',
    'http://acme.localhost:3001/inbox',
    'http://acme.localhost.evil.test:3000/inbox',
    'http://a.b.localhost:3000/inbox',
    `${tenant}/api/auth/sign-out`,
  ])
    expect(
      broker.handle(
        documentRequest(
          `${root}/__local/session/join?to=${encodeURIComponent(destination)}`,
          binding,
        ),
      ).response?.status,
    ).toBe(403)
})
it('expires transfers and never accepts browser auth without a known binding', () => {
  vi.useFakeTimers()
  try {
    const broker = createLocalSessionBroker()
    const initial = broker.handle(documentRequest(`${root}/login`))
    const binding = initial.setCookies[0].split(';')[0]
    const start = broker.handle(
      documentRequest(
        `${root}/__local/session/join?to=${encodeURIComponent(`${tenant}/inbox`)}`,
        binding,
      ),
    ).response
    vi.advanceTimersByTime(30_001)
    expect(broker.handle(documentRequest(location(start))).response?.status).toBe(403)
    expect(
      broker.handle(
        new Request(`${root}/api/auth/get-session`, {
          headers: { Cookie: 'better-auth.session_token=forged' },
        }),
      ).forwardCookie,
    ).toBe('')
  } finally {
    vi.useRealTimers()
  }
})

it('does not restore an old token from a delayed response after another identity signs in', () => {
  const broker = createLocalSessionBroker()
  const initial = broker.handle(documentRequest(`${root}/login`))
  const binding = initial.setCookies[0].split(';')[0]
  initial.capture(['better-auth.session_token=first; HttpOnly'])
  const delayed = broker.handle(documentRequest(`${root}/api/auth/get-session`, binding))
  const login = broker.handle(documentRequest(`${root}/api/auth/sign-in/email`, binding))
  login.capture(['better-auth.session_token=second; HttpOnly'])
  delayed.capture(['better-auth.session_token=first; HttpOnly'])
  expect(broker.handle(documentRequest(`${root}/inbox`, binding)).forwardCookie).toBe(
    'better-auth.session_token=second',
  )
})
