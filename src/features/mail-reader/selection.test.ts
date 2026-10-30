import { describe, expect, it } from 'vitest'
import { normalizeMailSearch } from '#/features/mail-list/types/mailSearch'

describe('mail selection URL', () => {
  it('keeps valid selection together with the normalized search', () => {
    expect(normalizeMailSearch({ q: ' invoice ', message: 'message-1' })).toEqual({
      q: 'invoice',
      message: 'message-1',
    })
  })
  it('rejects invalid selection and unrelated search fields', () => {
    expect(normalizeMailSearch({ message: '../private', workspace: 'other' })).toEqual({})
  })
})
