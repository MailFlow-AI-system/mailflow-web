import { queryOptions } from '@tanstack/react-query'
import type { MailSortValue } from '#/features/mail-sort/mailSort'

import { fetchMailMessages } from '../clients/mailMessagesClient'
import type { MailFolderName } from '../types/mailFolder'

// Prefix shared by every list cache of one user and workspace, across folders, searches and
// orders. Keys end with the order, so the prefixes and the folder position stay stable.
export const mailMessagesScopeKey = (userId: string, workspaceSlug: string) =>
  ['mail-messages', userId, workspaceSlug] as const

export const mailMessagesPageScopeKey = (userId: string, workspaceSlug: string) =>
  ['mail-messages-page', userId, workspaceSlug] as const

export const mailMessagesKey = (
  userId: string,
  workspaceSlug: string,
  q: string,
  folder: MailFolderName = 'inbox',
  sort: MailSortValue = 'newest',
) => [...mailMessagesScopeKey(userId, workspaceSlug), folder, q, sort] as const

// Cursors are specific to one order, so each order caches its own pages.
export const mailMessagesPageKey = (
  userId: string,
  workspaceSlug: string,
  q: string,
  cursor: string | null,
  folder: MailFolderName = 'inbox',
  sort: MailSortValue = 'newest',
) => [...mailMessagesPageScopeKey(userId, workspaceSlug), folder, q, cursor, sort] as const

export function mailMessagesPageOptions(
  userId: string,
  workspaceSlug: string,
  q: string,
  cursor: string | null,
  consumerSignal?: AbortSignal,
  folder: MailFolderName = 'inbox',
  sort: MailSortValue = 'newest',
) {
  return queryOptions({
    queryKey: mailMessagesPageKey(userId, workspaceSlug, q, cursor, folder, sort),
    queryFn: ({ signal }) =>
      fetchMailMessages({
        userId,
        q,
        folder,
        cursor,
        sort,
        signal: consumerSignal ? AbortSignal.any([signal, consumerSignal]) : signal,
      }),
    staleTime: 30_000,
    retry: 1,
  })
}
