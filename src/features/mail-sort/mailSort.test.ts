import { describe, expect, it } from 'vitest'

import { defaultMailSort, isMailSortValue, mailSortValues, parseMailSort } from './mailSort'

describe('mail sort values', () => {
  it('lists every supported order with newest first as the default', () => {
    expect(mailSortValues).toEqual([
      'newest',
      'oldest',
      'sender-asc',
      'sender-desc',
      'subject-asc',
      'subject-desc',
    ])
    expect(defaultMailSort).toBe('newest')
  })

  it.each(mailSortValues)('accepts %s', (value) => {
    expect(isMailSortValue(value)).toBe(true)
    expect(parseMailSort(value)).toBe(value)
  })

  it.each([null, undefined, '', 'NEWEST', 'date', ' oldest', 1, {}, ['oldest']])(
    'rejects %j and falls back to newest',
    (value) => {
      expect(isMailSortValue(value)).toBe(false)
      expect(parseMailSort(value)).toBe('newest')
    },
  )
})
