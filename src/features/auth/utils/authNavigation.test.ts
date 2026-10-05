import { describe, expect, it } from 'vitest'
import { normalizeLoginSearch, safeMailCollectionPath } from './authNavigation'

describe('bounded login continuation', () => {
  it.each(['/sent', '/drafts', '/starred', '/spam', '/trash'] as const)(
    'preserves safe collection %s',
    (path) => {
      expect(safeMailCollectionPath(path)).toBe(path)
      expect(normalizeLoginSearch({ returnTo: path, userId: 'ignore' })).toEqual({ returnTo: path })
    },
  )
  it.each([
    'https://evil.test',
    '//evil.test',
    '/sent?q=private',
    '/inbox/message-id',
    '/%2fsent',
    '/sent#private',
    null,
  ])('rejects untrusted continuation %s', (returnTo) => {
    expect(safeMailCollectionPath(returnTo)).toBe('/inbox')
    expect(normalizeLoginSearch({ returnTo })).toEqual({})
  })
})
