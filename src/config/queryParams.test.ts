import { describe, expect, it } from 'vitest'

import { parseQueryParams, stringifyQueryParams } from './queryParams'

describe('Nuqs-compatible router query parameters', () => {
  it.each(['123', 'false', 'true', 'null', '{"archived":true}'])(
    'preserves %s as literal text',
    (q) => {
      expect(parseQueryParams(`?q=${encodeURIComponent(q)}`).q).toBe(q)
      expect(new URLSearchParams(stringifyQueryParams({ q })).get('q')).toBe(q)
    },
  )

  it('preserves opaque token characters and omits absent values', () => {
    const search = { token: 'opaque+value/segment=', q: undefined }
    expect(parseQueryParams(stringifyQueryParams(search))).toEqual({ token: search.token })
  })

  it('round-trips empty strings and literal SQL wildcard characters', () => {
    const search = { q: '100%_literal\\', empty: '' }
    expect(parseQueryParams(stringifyQueryParams(search))).toEqual(search)
  })
})
