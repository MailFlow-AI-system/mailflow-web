import { useMailSelection } from '#/features/mail-selection/hooks/useMailSelection'
import type { MailListOrder } from '#/features/mail-sort/mailSort'
import { useSentEmails } from '../hooks/useSentEmails'
import { MailListView } from './MailList'

export function SentMailList({
  userId,
  q = '',
  order,
  isSearching = false,
  heading,
  selectedId,
  onSelect,
  onAutoSelect,
}: {
  userId: string
  q?: string
  order?: MailListOrder
  isSearching?: boolean
  heading?: string
  selectedId?: string
  onSelect?: (id: string) => void
  onAutoSelect?: (id: string) => void
}) {
  const mail = useSentEmails(userId, q, order)
  const selection = useMailSelection()
  return (
    <MailListView
      label="Sent message list"
      q={q}
      sort={order?.sort}
      isSearching={isSearching}
      selectedId={selectedId}
      onSelect={onSelect}
      onAutoSelect={onAutoSelect}
      selection={selection ?? undefined}
      {...(heading ? { heading } : {})}
      mail={{
        ...mail,
        messages: mail.messages.map((message) => ({
          id: message.id,
          recipientEmail: message.to[0],
          senderName: message.recipientName || message.to.join(', '),
          subject: message.subject || '(No subject)',
          body: message.text,
          labels: message.labels,
          receivedAt: message.sentAt ?? '',
        })),
      }}
    />
  )
}
