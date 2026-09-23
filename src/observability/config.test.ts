import { describe, expect, it } from 'vitest'

import { createFaroConfig, createTracePropagationPattern, normalizeRoute } from './config'

describe('createFaroConfig', () => {
  it('returns no configuration when Faro values are absent', () => {
    expect(createFaroConfig({})).toBeUndefined()
  })

  it('accepts a complete public configuration and keeps API propagation scoped', () => {
    const config = createFaroConfig({
      VITE_FARO_COLLECTOR_URL: 'https://faro.example.test/collect',
      VITE_FARO_APP_NAME: 'mailflow-web',
      VITE_FARO_APP_ENVIRONMENT: 'development',
      VITE_FARO_APP_VERSION: '0.1.0',
      VITE_API_BASE_URL: 'https://api.example.test/v1',
    })

    expect(config).toMatchObject({
      collectorUrl: 'https://faro.example.test/collect',
      appName: 'mailflow-web',
      environment: 'development',
      version: '0.1.0',
      apiBaseUrl: 'https://api.example.test/v1',
    })
    expect(config?.tracePropagationPattern.test('https://api.example.test/v1/messages')).toBe(true)
    expect(config?.tracePropagationPattern.test('https://other.example.test/v1/messages')).toBe(
      false,
    )
  })

  it('treats malformed or incomplete public values as a safe no-op', () => {
    expect(
      createFaroConfig({
        VITE_FARO_COLLECTOR_URL: 'not-a-url',
        VITE_FARO_APP_NAME: 'mailflow-web',
        VITE_FARO_APP_ENVIRONMENT: 'development',
        VITE_FARO_APP_VERSION: '0.1.0',
      }),
    ).toBeUndefined()
  })
})

describe('observability route helpers', () => {
  it('normalizes query strings and unbounded path segments', () => {
    expect(
      normalizeRoute(
        '/app/workspaces/123/campaigns/550e8400-e29b-41d4-a716-446655440000?email=a@b.test',
      ),
    ).toBe('/app/workspaces/:id/campaigns/:id')
  })

  it('limits trace propagation to the configured API path', () => {
    const pattern = createTracePropagationPattern('https://api.example.test/v1')

    expect(pattern.test('https://api.example.test/v1')).toBe(true)
    expect(pattern.test('https://api.example.test/v10')).toBe(false)
    expect(pattern.test('https://api.example.test/other')).toBe(false)
  })
})
