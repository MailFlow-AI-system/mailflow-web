import { describe, expect, it } from 'vitest'

import { createClientEnvironment } from './env-schema'

describe('createClientEnvironment', () => {
  it('uses the root-relative API URL by default', () => {
    expect(createClientEnvironment({}).VITE_API_BASE_URL).toBe('/api')
  })

  it('rejects an invalid API URL', () => {
    expect(() => createClientEnvironment({ VITE_API_BASE_URL: 'mailflow-api' })).toThrow(
      'Invalid environment variables',
    )
  })

  it('treats an empty string as unset', () => {
    expect(createClientEnvironment({ VITE_API_BASE_URL: '' }).VITE_API_BASE_URL).toBe('/api')
  })

  it('accepts an absolute URL', () => {
    expect(
      createClientEnvironment({ VITE_API_BASE_URL: 'http://localhost:8080' }).VITE_API_BASE_URL,
    ).toBe('http://localhost:8080')
  })
})
