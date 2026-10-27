import { readWorkspaceResponse } from '#/features/workspaces/clients/workspaceAuthority'
import type { MailMessagesPage } from '../types/mailMessage'

type FetchMailMessagesInput = {
  userId: string
  q: string
  cursor?: string | null
  signal: AbortSignal
}

export async function fetchMailMessages({ userId, q, cursor, signal }: FetchMailMessagesInput) {
  const search = new URLSearchParams({ q: q.trim() })
  if (cursor) search.set('cursor', cursor)
  return (await readWorkspaceResponse(`/api/mail/messages?${search}`, userId, signal, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  })) as MailMessagesPage
}
