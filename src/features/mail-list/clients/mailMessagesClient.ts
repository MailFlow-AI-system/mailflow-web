import { explicitMailSort, type MailSortValue } from '#/features/mail-sort/mailSort'
import { readWorkspaceResponse } from '#/features/workspaces/clients/workspaceAuthority'
import type { MailFolderName } from '../types/mailFolder'
import type { MailMessagesPage } from '../types/mailMessage'

type FetchMailMessagesInput = {
  userId: string
  q: string
  folder?: MailFolderName
  cursor?: string | null
  sort?: MailSortValue
  signal: AbortSignal
}

export async function fetchMailMessages({
  userId,
  q,
  folder = 'inbox',
  cursor,
  sort = 'newest',
  signal,
}: FetchMailMessagesInput) {
  const search = new URLSearchParams({ q: q.trim() })
  if (folder !== 'inbox') search.set('folder', folder)
  if (cursor) search.set('cursor', cursor)
  const order = explicitMailSort(sort)
  if (order) search.set('sort', order)
  return (await readWorkspaceResponse(`/api/mail/messages?${search}`, userId, signal, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  })) as MailMessagesPage
}
