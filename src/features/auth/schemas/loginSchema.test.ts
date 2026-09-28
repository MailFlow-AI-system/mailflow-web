import { describe, expect, it } from 'vitest'

import { loginSchema } from './loginSchema'

describe('loginSchema', () => {
  it('accepts valid credentials', () => {
    expect(
      loginSchema.safeParse({ email: 'ada@example.test', password: 'password123' }).success,
    ).toBe(true)
  })

  it('rejects invalid email and empty password', () => {
    expect(loginSchema.safeParse({ email: 'invalid', password: '' }).success).toBe(false)
  })
})
