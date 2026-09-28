import { describe, expect, it } from 'vitest'

import { linkSchema } from './linkSchema'

describe('linkSchema', () => {
  it('accepts a web address and a mailto link', () => {
    expect(linkSchema.safeParse({ url: 'example.com' }).success).toBe(true)
    expect(linkSchema.safeParse({ url: 'mailto:ada@example.test' }).success).toBe(true)
  })

  it('rejects executable protocols', () => {
    expect(linkSchema.safeParse({ url: 'javascript:alert(1)' }).success).toBe(false)
  })
})
