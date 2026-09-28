import { describe, expect, it } from 'vitest'
import { normalizeLink } from './links'

describe('composer link policy', () => {
  it('normalizes web addresses and keeps mailto links', () => {
    expect(normalizeLink('example.com/path')).toBe('https://example.com/path')
    expect(normalizeLink(' https://example.com?q=1 ')).toBe('https://example.com/?q=1')
    expect(normalizeLink('mailto:hello@example.com')).toBe('mailto:hello@example.com')
  })
  it('rejects executable protocols, credentials, empty and malformed inputs', () => {
    for (const value of [
      'javascript:alert(1)',
      'data:text/html,test',
      'file:///etc/passwd',
      'https://user:pass@example.com',
      '',
      'https://',
      'mailto:invalid',
      'exa\nmple.com',
    ]) {
      expect(normalizeLink(value)).toBeNull()
    }
  })
})
