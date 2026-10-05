import { describe, expect, it } from 'vitest'

import { createClientEnvironment } from './env-schema'

describe('createClientEnvironment', () => {
  it('keeps switching dark by default and only enables it in the isolated test zone', () => {
    expect(
      createClientEnvironment({ VITE_API_BASE_URL: 'http://localhost:8080' })
        .VITE_WORKSPACE_LOCAL_SWITCHING_ENABLED,
    ).toBe(false)
    expect(
      createClientEnvironment({
        VITE_API_BASE_URL: 'http://localhost:8080',
        VITE_WORKSPACE_BASE_HOST: 'workspace.test',
        VITE_WORKSPACE_LOCAL_SWITCHING_ENABLED: 'true',
      }).VITE_WORKSPACE_LOCAL_SWITCHING_ENABLED,
    ).toBe(true)
    expect(() =>
      createClientEnvironment({
        VITE_API_BASE_URL: 'http://localhost:8080',
        VITE_WORKSPACE_BASE_HOST: 'production.example',
        VITE_WORKSPACE_LOCAL_SWITCHING_ENABLED: 'true',
      }),
    ).toThrow('isolated')
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
