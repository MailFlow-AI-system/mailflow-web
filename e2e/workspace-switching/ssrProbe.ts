import assert from 'node:assert/strict'
import type { SwitchingFixture } from './types'

const port = process.argv[2]
assert.equal(port, '3003', 'The localhost session probe requires the dedicated Vite dev server')
const api = 'http://127.0.0.1:8083'
const data: SwitchingFixture = await (await fetch(`${api}/__fixture`)).json()
const reset = await fetch(`${api}/__fixture/control`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-fixture-control': data.controlKey },
  body: JSON.stringify({ action: 'reset' }),
})
assert.equal(reset.status, 200)
const rootHost = `localhost:${port}`
const initial = await fetch(`http://127.0.0.1:${port}/login`, {
  headers: { Host: rootHost, Accept: 'text/html' },
})
const cookie = initial.headers
  .getSetCookie()
  .filter((value) => value.startsWith('mailflow.local_session='))
  .map((value) => value.split(';')[0])
  .join('; ')
assert.ok(cookie, 'The dev server must establish a host-only browser binding')
const signIn = await fetch(`http://127.0.0.1:${port}/api/auth/sign-in/email`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Origin: `http://${rootHost}`,
    Host: rootHost,
    Cookie: cookie,
  },
  body: JSON.stringify({ email: data.email, password: data.password }),
})
assert.equal(signIn.status, 200)
const started = performance.now()
const statuses = await Promise.all(
  Array.from({ length: 18 }, async (_, index) => {
    const generic = index >= 12
    const host = generic ? 'localhost' : index % 2 ? data.targetHost : data.host
    const response = await fetch(`http://127.0.0.1:${port}/inbox`, {
      headers: { Host: `${host}:${port}`, Cookie: cookie },
      redirect: 'manual',
      signal: AbortSignal.timeout(30000),
    })
    const html = await response.text()
    assert.ok(!html.includes('(intermediate value) is not a function'))
    if (generic) {
      assert.ok([301, 302, 303, 307, 308].includes(response.status))
      const target = new URL(response.headers.get('location') ?? '')
      assert.equal(target.hostname, data.fallbackHost)
      assert.equal(target.pathname, '/inbox')
      assert.equal(target.search, '')
    } else {
      assert.equal(response.status, 200)
      assert.ok(html.includes('aria-label="Workspace:') && html.includes('Compose'))
    }
    return response.status
  }),
)
const after: SwitchingFixture = await (await fetch(`${api}/__fixture`)).json()
assert.equal(after.selections, 0)
assert.equal(after.globalMailCalls, 0)
assert.equal(after.preference, null)
assert.equal(after.hasActiveOrganization, false)
console.info(
  JSON.stringify({
    port,
    requests: statuses.length,
    statuses,
    elapsedMs: Math.round(performance.now() - started),
  }),
)
