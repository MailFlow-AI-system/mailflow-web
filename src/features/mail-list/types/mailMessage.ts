import type { MailLabel } from '#/features/mail-labels/mailLabel'

export type MailMessage = {
  id: string
  senderName: string
  recipientEmail?: string
  labels?: MailLabel[]
  subject: string
  body: string
  receivedAt: string
}

export type MailMessagesPage = {
  items: MailMessage[]
  nextCursor: string | null
}
