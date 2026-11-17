import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../clients/mailMessagesClient', () => ({ fetchMailMessages: vi.fn() }))

import {
  mailMessagesKey,
  mailMessagesPageKey,
  mailMessagesPageOptions,
  mailMessagesPageScopeKey,
  mailMessagesScopeKey,
} from './mailMessagesQuery'

describe('mail message query keys', () => {
  it('ends list and page keys with the order so each order caches its own pages', () => {
    expect(mailMessagesKey('user-1', 'acme', 'q', 'trash', 'oldest')).toEqual([
      'mail-messages',
      'user-1',
      'acme',
      'trash',
      'q',
      'oldest',
    ])
    expect(mailMessagesKey('user-1', 'acme', '')).toEqual([
      'mail-messages',
      'user-1',
      'acme',
      'inbox',
      '',
      'newest',
    ])
    expect(mailMessagesPageKey('user-1', 'acme', '', 'c', 'spam', 'sender-asc')).toEqual([
      'mail-messages-page',
      'user-1',
      'acme',
      'spam',
      '',
      'c',
      'sender-asc',
    ])
    expect(
      mailMessagesPageOptions('user-1', 'acme', '', null, undefined, 'inbox', 'subject-desc')
        .queryKey,
    ).toEqual(mailMessagesPageKey('user-1', 'acme', '', null, 'inbox', 'subject-desc'))
  })

  it('keeps scope prefixes matching every order', () => {
    const client = new QueryClient()
    client.setQueryData(mailMessagesKey('user-1', 'acme', '', 'inbox', 'newest'), 1)
    client.setQueryData(mailMessagesKey('user-1', 'acme', '', 'inbox', 'subject-asc'), 2)
    client.setQueryData(mailMessagesPageKey('user-1', 'acme', '', null, 'inbox', 'oldest'), 3)
    expect(
      client.getQueriesData({ queryKey: mailMessagesScopeKey('user-1', 'acme') }),
    ).toHaveLength(2)
    expect(
      client.getQueriesData({ queryKey: mailMessagesPageScopeKey('user-1', 'acme') }),
    ).toHaveLength(1)
  })
})
