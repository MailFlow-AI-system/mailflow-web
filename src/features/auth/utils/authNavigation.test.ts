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

describe('workspace handoff notice', () => {
  it('keeps only the known expired-handoff marker', () => {
    expect(normalizeLoginSearch({ handoff: 'expired' })).toEqual({ handoff: 'expired' })
    expect(normalizeLoginSearch({ handoff: 'expired', returnTo: '/sent' })).toEqual({
      handoff: 'expired',
      returnTo: '/sent',
    })
    for (const handoff of ['other', '<script>', 1, null])
      expect(normalizeLoginSearch({ handoff })).toEqual({})
  })
})
