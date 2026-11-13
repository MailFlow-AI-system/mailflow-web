import { describe, expect, it } from 'vitest'
import type { MailMessage } from '#/features/mail-list/types/mailMessage'
import { applyMessageAction, inverseMessageAction, isInMailFolder } from './messageActions'

const now = '2026-11-13T10:00:00.000Z'
const base: MailMessage = {
  id: 'm1',
  senderName: 'Ada',
  subject: 'Invoice',
  body: 'Please review.',
  receivedAt: '2026-11-01T10:00:00.000Z',
  isRead: false,
  isStarred: false,
  archivedAt: null,
  trashedAt: null,
  spamAt: null,
}

describe('applyMessageAction', () => {
  it('toggles per-user read and star state without touching folders', () => {
    const read = applyMessageAction(base, 'read', now)
    expect(read).toMatchObject({ isRead: true, isStarred: false, archivedAt: null })
    expect(applyMessageAction(read as MailMessage, 'unread', now)?.isRead).toBe(false)
    const starred = applyMessageAction(base, 'star', now)
    expect(starred?.isStarred).toBe(true)
    expect(applyMessageAction(starred as MailMessage, 'unstar', now)?.isStarred).toBe(false)
  })

  it('records workspace moves and clears them on restore', () => {
    const archived = applyMessageAction(base, 'archive', now)
    expect(archived?.archivedAt).toBe(now)
    expect(applyMessageAction(archived as MailMessage, 'unarchive', now)?.archivedAt).toBeNull()
    const trashed = applyMessageAction(base, 'trash', now)
    expect(trashed?.trashedAt).toBe(now)
    expect(applyMessageAction(trashed as MailMessage, 'restore', now)?.trashedAt).toBeNull()
    const spam = applyMessageAction(base, 'spam', now)
    expect(spam?.spamAt).toBe(now)
    expect(applyMessageAction(spam as MailMessage, 'not_spam', now)?.spamAt).toBeNull()
  })

  it('removes a permanently deleted message and returns a new object otherwise', () => {
    expect(applyMessageAction(base, 'delete_permanently', now)).toBeNull()
    expect(applyMessageAction(base, 'read', now)).not.toBe(base)
  })
})

describe('isInMailFolder', () => {
  const cases: [Partial<MailMessage>, Record<string, boolean>][] = [
    [{}, { inbox: true, archive: false, trash: false, spam: false, starred: false }],
    [{ archivedAt: now }, { inbox: false, archive: true, trash: false, spam: false }],
    [
      { trashedAt: now, archivedAt: now },
      { inbox: false, archive: false, trash: true },
    ],
    [
      { spamAt: now, archivedAt: now },
      { inbox: false, archive: false, spam: true, trash: false },
    ],
    [{ isStarred: true, archivedAt: now }, { starred: true }],
    [
      { isStarred: true, trashedAt: now },
      { starred: false, trash: true },
    ],
    [
      { isStarred: true, spamAt: now },
      { starred: false, spam: true },
    ],
  ]
  it.each(cases)('applies folder precedence for %o', (state, expected) => {
    for (const [folder, inFolder] of Object.entries(expected)) {
      expect(isInMailFolder({ ...base, ...state }, folder as never)).toBe(inFolder)
    }
  })
})

describe('inverseMessageAction', () => {
  it('undoes every reversible action and refuses permanent deletion', () => {
    expect(inverseMessageAction('archive')).toBe('unarchive')
    expect(inverseMessageAction('trash')).toBe('restore')
    expect(inverseMessageAction('spam')).toBe('not_spam')
    expect(inverseMessageAction('read')).toBe('unread')
    expect(inverseMessageAction('star')).toBe('unstar')
    expect(inverseMessageAction('restore')).toBe('trash')
    expect(inverseMessageAction('delete_permanently')).toBeNull()
  })
})
