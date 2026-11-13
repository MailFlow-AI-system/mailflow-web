import { type InfiniteData, QueryClient } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'

vi.mock('#/features/auth/adapters/getCurrentSession', () => ({ getCurrentSession: vi.fn() }))

import {
  mailMessagesKey,
  mailMessagesPageKey,
} from '#/features/mail-list/queries/mailMessagesQuery'
import type { MailMessage, MailMessagesPage } from '#/features/mail-list/types/mailMessage'
import { patchMessageCaches } from './messageCache'

const now = '2026-11-13T10:00:00.000Z'
const message = (id: string, state: Partial<MailMessage> = {}): MailMessage => ({
  id,
  senderName: 'Ada',
  subject: id,
  body: '',
  receivedAt: now,
  isRead: false,
  isStarred: false,
  archivedAt: null,
  trashedAt: null,
  spamAt: null,
  ...state,
})
const pages = (...items: MailMessage[][]): InfiniteData<MailMessagesPage> => ({
  pages: items.map((page) => ({ items: page, nextCursor: null })),
  pageParams: items.map(() => null),
})
const ids = (data: InfiniteData<MailMessagesPage> | undefined) =>
  data?.pages.flatMap((page) => page.items.map((item) => item.id))

function setup() {
  const client = new QueryClient()
  const inbox = mailMessagesKey('u1', 'acme', '', 'inbox')
  const inboxSearch = mailMessagesKey('u1', 'acme', 'ada', 'inbox')
  const starred = mailMessagesKey('u1', 'acme', '', 'starred')
  const otherWorkspace = mailMessagesKey('u1', 'other', '', 'inbox')
  const inboxPage = mailMessagesPageKey('u1', 'acme', '', null, 'inbox')
  client.setQueryData(inbox, pages([message('a'), message('b')], [message('c')]))
  client.setQueryData(inboxSearch, pages([message('a')]))
  client.setQueryData(starred, pages([message('b', { isStarred: true })]))
  client.setQueryData(otherWorkspace, pages([message('a')]))
  client.setQueryData(inboxPage, { items: [message('a'), message('b')], nextCursor: 'n' })
  client.setQueryData(['mail-detail', 'u1', 'w1', 'host', 'messages', 'a'], {
    id: 'a',
    isRead: false,
    isStarred: false,
  })
  return { client, inbox, inboxSearch, starred, otherWorkspace, inboxPage }
}

describe('patchMessageCaches', () => {
  it('removes moved messages from every list of the workspace that no longer holds them', () => {
    const { client, inbox, inboxSearch, otherWorkspace, inboxPage } = setup()
    patchMessageCaches(client, { userId: 'u1', workspaceSlug: 'acme' }, ['a', 'c'], 'archive', now)

    expect(ids(client.getQueryData(inbox))).toEqual(['b'])
    expect(ids(client.getQueryData(inboxSearch))).toEqual([])
    expect(client.getQueryData<MailMessagesPage>(inboxPage)?.items.map((m) => m.id)).toEqual(['b'])
    expect(ids(client.getQueryData(otherWorkspace))).toEqual(['a'])
  })

  it('updates per-user state in place and leaves the starred list consistent', () => {
    const { client, inbox, starred } = setup()
    patchMessageCaches(client, { userId: 'u1', workspaceSlug: 'acme' }, ['a'], 'star', now)
    expect(
      client.getQueryData<InfiniteData<MailMessagesPage>>(inbox)?.pages[0]?.items[0],
    ).toMatchObject({ id: 'a', isStarred: true })
    patchMessageCaches(client, { userId: 'u1', workspaceSlug: 'acme' }, ['b'], 'unstar', now)
    expect(ids(client.getQueryData(starred))).toEqual([])
  })

  it('patches the open message and restores every cache on rollback', () => {
    const { client, inbox, starred } = setup()
    const before = client.getQueryData(inbox)
    const rollback = patchMessageCaches(
      client,
      { userId: 'u1', workspaceSlug: 'acme' },
      ['a', 'b'],
      'read',
      now,
    )
    expect(client.getQueryData(['mail-detail', 'u1', 'w1', 'host', 'messages', 'a'])).toMatchObject(
      {
        isRead: true,
      },
    )

    rollback()

    expect(client.getQueryData(inbox)).toEqual(before)
    expect(ids(client.getQueryData(starred))).toEqual(['b'])
    expect(client.getQueryData(['mail-detail', 'u1', 'w1', 'host', 'messages', 'a'])).toMatchObject(
      {
        isRead: false,
      },
    )
  })
})
