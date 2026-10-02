import { queryOptions } from '@tanstack/react-query'

import { fetchMailMessages } from '../clients/mailMessagesClient'

export const mailMessagesKey = (userId: string, q: string) => ['mail-messages', userId, q] as const

export const mailMessagesPageKey = (userId: string, q: string, cursor: string | null) =>
  ['mail-messages-page', userId, q, cursor] as const

export function mailMessagesPageOptions(userId: string, q: string, cursor: string | null) {
  return queryOptions({
    queryKey: mailMessagesPageKey(userId, q, cursor),
    queryFn: ({ signal }) => fetchMailMessages({ q, cursor, signal }),
    staleTime: 30_000,
    retry: 1,
  })
}
