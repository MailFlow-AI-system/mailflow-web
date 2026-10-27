import { queryOptions } from '@tanstack/react-query'

import { fetchMailMessages } from '../clients/mailMessagesClient'

export const mailMessagesKey = (userId: string, workspaceSlug: string, q: string) =>
  ['mail-messages', userId, workspaceSlug, q] as const

export const mailMessagesPageKey = (
  userId: string,
  workspaceSlug: string,
  q: string,
  cursor: string | null,
) => ['mail-messages-page', userId, workspaceSlug, q, cursor] as const

export function mailMessagesPageOptions(
  userId: string,
  workspaceSlug: string,
  q: string,
  cursor: string | null,
  consumerSignal?: AbortSignal,
) {
  return queryOptions({
    queryKey: mailMessagesPageKey(userId, workspaceSlug, q, cursor),
    queryFn: ({ signal }) =>
      fetchMailMessages({
        userId,
        q,
        cursor,
        signal: consumerSignal ? AbortSignal.any([signal, consumerSignal]) : signal,
      }),
    staleTime: 30_000,
    retry: 1,
  })
}
