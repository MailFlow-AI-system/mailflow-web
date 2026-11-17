import { describe, expect, it } from 'vitest'

import { orderQueryParams, parseQueryParams, stringifyQueryParams } from './queryParams'

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

  it('writes list state before the open message in a fixed order', () => {
    expect(stringifyQueryParams({ message: 'm-1', sort: 'oldest' })).toBe(
      '?sort=oldest&message=m-1',
    )
    expect(stringifyQueryParams({ sort: 'oldest', message: 'm-1' })).toBe(
      '?sort=oldest&message=m-1',
    )
    expect(stringifyQueryParams({ message: 'm-1', other: 'x', sort: 'oldest', q: 'invoice' })).toBe(
      '?q=invoice&sort=oldest&message=m-1&other=x',
    )
  })

  it('orders search parameters written in place by nuqs the same way', () => {
    const search = new URLSearchParams('message=m-1&other=x&sort=oldest&q=invoice')
    expect(orderQueryParams(search).toString()).toBe('q=invoice&sort=oldest&message=m-1&other=x')
  })
})
