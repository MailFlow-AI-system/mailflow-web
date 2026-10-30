import { useSentEmails } from '../hooks/useSentEmails'
import { MailListView } from './MailList'

export function SentMailList({
  userId,
  selectedId,
  onSelect,
  onAutoSelect,
}: {
  userId: string
  selectedId?: string
  onSelect?: (id: string) => void
  onAutoSelect?: (id: string) => void
}) {
  const mail = useSentEmails(userId)
  return (
    <MailListView
      label="Sent message list"
      selectedId={selectedId}
      onSelect={onSelect}
      onAutoSelect={onAutoSelect}
      mail={{
        ...mail,
        messages: mail.messages.map((message) => ({
          id: message.id,
          recipientEmail: message.to[0],
          senderName: message.recipientName || message.to.join(', '),
          subject: message.subject || '(Sem assunto)',
          body: message.text,
          receivedAt: message.sentAt ?? '',
        })),
      }}
    />
  )
}
