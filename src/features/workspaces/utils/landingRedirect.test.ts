import { describe, expect, it } from 'vitest'
import { landingRedirect } from './landingRedirect'

const production = { baseHost: 'mailflow-ai.online', siteUrl: 'https://mailflow-ai.online' }
const development = {
  baseHost: 'dev.mailflow-ai.online',
  siteUrl: 'https://site-dev.mailflow-ai.online',
}

describe('landing redirect for hosts without a workspace', () => {
  it.each([
    ['https://app.mailflow-ai.online/login', production],
    ['https://app.mailflow-ai.online/', production],
    ['https://www.mailflow-ai.online/inbox?q=1', production],
    ['https://app-dev.mailflow-ai.online/login', development],
    ['https://dev.mailflow-ai.online/', development],
    ['https://a.b.dev.mailflow-ai.online/', development],
  ])('sends %s to the environment landing', (url, environment) => {
    expect(landingRedirect(new URL(url), environment.baseHost, environment.siteUrl)).toBe(
      `${environment.siteUrl}/`,
    )
  })
  it.each([
    ['https://acme.mailflow-ai.online/login', production],
    ['https://acme.dev.mailflow-ai.online/inbox', development],
    // Loopback health checks and preview tooling never carry a workspace.
    ['http://127.0.0.1:3000/', development],
    ['http://[::1]:3000/', development],
  ])('serves %s', (url, environment) => {
    expect(landingRedirect(new URL(url), environment.baseHost, environment.siteUrl)).toBeNull()
  })
  it('redirects the bare local host to the local Site', () => {
    expect(
      landingRedirect(new URL('http://localhost:3000/login'), 'localhost', 'http://localhost:4321'),
    ).toBe('http://localhost:4321/')
    expect(
      landingRedirect(
        new URL('http://acme.localhost:3000/login'),
        'localhost',
        'http://localhost:4321',
      ),
    ).toBeNull()
  })
})
