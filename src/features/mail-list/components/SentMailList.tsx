import { useSentEmails } from '../hooks/useSentEmails'
import { MailListView } from './MailList'

export function SentMailList({ userId }: { userId: string }) {
  const mail = useSentEmails(userId)
  return (
    <MailListView
      label="Sent message list"
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
