import { describe, expect, it } from 'vitest'

import { isCloudflareAccountId } from './cloudflare-account'

describe('isCloudflareAccountId', () => {
  it('rejects missing, empty, and malformed account IDs', () => {
    expect(isCloudflareAccountId(undefined)).toBe(false)
    expect(isCloudflareAccountId('')).toBe(false)
    expect(isCloudflareAccountId('account-id')).toBe(false)
    expect(isCloudflareAccountId('0'.repeat(31))).toBe(false)
    expect(isCloudflareAccountId('g'.repeat(32))).toBe(false)
  })

  it('accepts a canonical account ID with surrounding whitespace', () => {
    expect(isCloudflareAccountId(`  ${'a'.repeat(32)}  `)).toBe(true)
  })
})
