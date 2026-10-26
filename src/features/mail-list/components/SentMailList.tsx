import { useInfiniteQuery } from '@tanstack/react-query'
import { fetchSentEmails } from '../clients/sentEmailsClient'
import { MailListView } from './MailList'

export function SentMailList({ userId }: { userId: string }) {
  const mail = useInfiniteQuery({
    queryKey: ['sent-emails', userId],
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) => fetchSentEmails(pageParam, signal),
    getNextPageParam: (page) => page.nextOffset ?? undefined,
    retry: false,
  })
  const seen = new Set<string>()
  const messages = (mail.data?.pages.flatMap((page) => page.items) ?? []).filter(({ id }) => {
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })
  return (
    <MailListView
      label="Sent message list"
      mail={{
        ...mail,
        messages: messages.map((message) => ({
          id: message.id,
          senderName: message.recipientName || message.to.join(', '),
          subject: message.subject || '(Sem assunto)',
          body: message.text,
          receivedAt: message.sentAt ?? '',
        })),
        hasNextPageError: mail.isFetchNextPageError,
        fetchNextPage: () => mail.fetchNextPage({ cancelRefetch: false }),
      }}
    />
  )
}
