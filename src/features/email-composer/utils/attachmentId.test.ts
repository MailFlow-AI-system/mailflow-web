import { afterEach, describe, expect, it, vi } from 'vitest'
import { createAttachmentId } from './attachmentId'

describe('attachment identifier', () => {
  afterEach(() => vi.unstubAllGlobals())
  it('uses randomUUID on secure origins', () => {
    const randomUUID = vi.fn(() => 'secure-id')
    vi.stubGlobal('crypto', { randomUUID })
    expect(createAttachmentId()).toBe('secure-id')
  })
  it('supports local HTTP subdomains with random bytes instead of a secure-context-only API', () => {
    let counter = 0
    vi.stubGlobal('crypto', { getRandomValues: (bytes: Uint8Array) => bytes.fill(++counter) })
    const first = createAttachmentId(),
      second = createAttachmentId()
    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    expect(first).not.toBe(second)
  })
})
