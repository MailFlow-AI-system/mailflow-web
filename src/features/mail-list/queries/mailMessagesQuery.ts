import { queryOptions } from '@tanstack/react-query'

import { fetchMailMessages } from '../clients/mailMessagesClient'
import type { MailFolderName } from '../types/mailFolder'

// Prefix shared by every list cache of one user and workspace, across folders and searches.
export const mailMessagesScopeKey = (userId: string, workspaceSlug: string) =>
  ['mail-messages', userId, workspaceSlug] as const

export const mailMessagesPageScopeKey = (userId: string, workspaceSlug: string) =>
  ['mail-messages-page', userId, workspaceSlug] as const

export const mailMessagesKey = (
  userId: string,
  workspaceSlug: string,
  q: string,
  folder: MailFolderName = 'inbox',
) => [...mailMessagesScopeKey(userId, workspaceSlug), folder, q] as const

export const mailMessagesPageKey = (
  userId: string,
  workspaceSlug: string,
  q: string,
  cursor: string | null,
  folder: MailFolderName = 'inbox',
) => [...mailMessagesPageScopeKey(userId, workspaceSlug), folder, q, cursor] as const

export function mailMessagesPageOptions(
  userId: string,
  workspaceSlug: string,
  q: string,
  cursor: string | null,
  consumerSignal?: AbortSignal,
  folder: MailFolderName = 'inbox',
) {
  return queryOptions({
    queryKey: mailMessagesPageKey(userId, workspaceSlug, q, cursor, folder),
    queryFn: ({ signal }) =>
      fetchMailMessages({
        userId,
        q,
        folder,
        cursor,
        signal: consumerSignal ? AbortSignal.any([signal, consumerSignal]) : signal,
      }),
    staleTime: 30_000,
    retry: 1,
  })
}
