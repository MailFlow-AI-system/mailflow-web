import type { MailMessagesPage } from '../types/mailMessage'

type FetchMailMessagesInput = {
  q: string
  cursor?: string | null
  signal: AbortSignal
}

export async function fetchMailMessages({ q, cursor, signal }: FetchMailMessagesInput) {
  const search = new URLSearchParams({ q: q.trim() })
  if (cursor) search.set('cursor', cursor)

  let response: Response
  try {
    response = await fetch(`/api/mail/messages?${search.toString()}`, {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal,
    })
  } catch (error) {
    if (signal.aborted) throw error
    throw new Error('Messages are temporarily unavailable.')
  }

  if (!response.ok) throw new Error('Messages are temporarily unavailable.')

  return (await response.json()) as MailMessagesPage
}
