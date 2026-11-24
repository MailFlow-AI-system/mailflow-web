import { describe, expect, it } from 'vitest'

import { createClientEnvironment } from './env-schema'

describe('createClientEnvironment', () => {
  it('hosts workspaces under a root or nested environment base with the landing as fallback', () => {
    const remote = {
      VITE_API_BASE_URL: 'https://api.example.com',
      VITE_WORKSPACE_BASE_HOST: 'example.com',
      VITE_WORKSPACE_SWITCHING_ENABLED: 'true',
      VITE_SITE_URL: 'https://example.com',
    }
    const config = createClientEnvironment(remote)
    expect(config.workspaceSwitchingEnabled).toBe(true)
    expect(config.VITE_SITE_URL).toBe('https://example.com')
    expect(
      createClientEnvironment({ ...remote, VITE_WORKSPACE_BASE_HOST: 'staging.example.com' })
        .VITE_WORKSPACE_BASE_HOST,
    ).toBe('staging.example.com')
    expect(
      createClientEnvironment({ VITE_API_BASE_URL: remote.VITE_API_BASE_URL })
        .workspaceSwitchingEnabled,
    ).toBe(false)
    for (const host of [undefined, 'workspace.test', 'com', '127.0.0.1', 'app.localhost']) {
      expect(() => createClientEnvironment({ ...remote, VITE_WORKSPACE_BASE_HOST: host })).toThrow()
    }
    expect(() =>
      createClientEnvironment({ ...remote, VITE_API_BASE_URL: 'http://api.example.com' }),
    ).toThrow('HTTPS')
    expect(() => createClientEnvironment({ ...remote, VITE_SITE_URL: undefined })).toThrow(
      'VITE_SITE_URL',
    )
    expect(() =>
      createClientEnvironment({ ...remote, VITE_SITE_URL: 'https://example.com/path' }),
    ).toThrow('Invalid environment variables')
  })
  it('hosts local workspaces on localhost or the isolated test zone with a loopback Core', () => {
    for (const host of ['localhost', 'workspace.test'])
      expect(
        createClientEnvironment({
          VITE_API_BASE_URL: 'http://localhost:8080',
          VITE_WORKSPACE_BASE_HOST: host,
          VITE_WORKSPACE_SWITCHING_ENABLED: 'true',
          VITE_SITE_URL: 'http://localhost:4321',
        }).workspaceSwitchingEnabled,
      ).toBe(true)
  })
  it.each([
    'https://workspace.test',
    '*.workspace.test',
    'workspace.test:3001',
    'a.-b.test',
    `${'a'.repeat(64)}.test`,
  ])('rejects invalid workspace base hostname %s', (hostname) => {
    expect(() =>
      createClientEnvironment({
        VITE_API_BASE_URL: 'https://core.test',
        VITE_WORKSPACE_BASE_HOST: hostname,
      }),
    ).toThrow('Invalid environment variables')
  })
  it('accepts an exact workspace zone and does not require it for the dark rollout', () => {
    expect(
      createClientEnvironment({
        VITE_API_BASE_URL: 'https://core.test',
        VITE_WORKSPACE_BASE_HOST: 'web-development.workspace.test',
      }).VITE_WORKSPACE_BASE_HOST,
    ).toBe('web-development.workspace.test')
    expect(
      createClientEnvironment({ VITE_API_BASE_URL: 'https://core.test' }).VITE_WORKSPACE_BASE_HOST,
    ).toBeUndefined()
  })
  it('requires an absolute API URL', () => {
    expect(() => createClientEnvironment({})).toThrow('Invalid environment variables')
    expect(() => createClientEnvironment({ VITE_API_BASE_URL: '/api' })).toThrow(
      'Invalid environment variables',
    )
  })

  it('rejects an invalid API URL', () => {
    expect(() => createClientEnvironment({ VITE_API_BASE_URL: 'mailflow-api' })).toThrow(
      'Invalid environment variables',
    )
  })

  it('rejects an API URL with a path or credentials', () => {
    expect(() =>
      createClientEnvironment({ VITE_API_BASE_URL: 'https://api.example.test/path' }),
    ).toThrow('Invalid environment variables')
    expect(() =>
      createClientEnvironment({ VITE_API_BASE_URL: 'https://user:pass@api.example.test' }),
    ).toThrow('Invalid environment variables')
  })

  it('rejects an empty string', () => {
    expect(() => createClientEnvironment({ VITE_API_BASE_URL: '' })).toThrow(
      'Invalid environment variables',
    )
  })

  it('accepts an absolute URL', () => {
    expect(
      createClientEnvironment({ VITE_API_BASE_URL: 'http://localhost:8080' }).VITE_API_BASE_URL,
    ).toBe('http://localhost:8080')
  })
})

it('accepts localhost switching with a loopback HTTP Core only', () => {
  const local = {
    VITE_API_BASE_URL: 'http://localhost:8080',
    VITE_WORKSPACE_BASE_HOST: 'localhost',
    VITE_WORKSPACE_SWITCHING_ENABLED: 'true',
    VITE_SITE_URL: 'http://localhost:4321',
  }
  expect(createClientEnvironment(local).workspaceSwitchingEnabled).toBe(true)
  expect(() =>
    createClientEnvironment({ ...local, VITE_API_BASE_URL: 'https://api.example.com' }),
  ).toThrow('loopback')
})
