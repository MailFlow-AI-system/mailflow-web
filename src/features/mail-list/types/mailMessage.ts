export type MailMessage = {
  id: string
  senderName: string
  subject: string
  body: string
  receivedAt: string
}

export type MailMessagesPage = {
  items: MailMessage[]
  nextCursor: string | null
}
