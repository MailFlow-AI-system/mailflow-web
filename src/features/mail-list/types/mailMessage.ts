import type { MailLabel } from '#/features/mail-labels/mailLabel'

export type MailMessage = {
  id: string
  senderName: string
  recipientEmail?: string
  labels?: MailLabel[]
  subject: string
  body: string
  receivedAt: string
  // Per-user state for the current user.
  isRead?: boolean
  isStarred?: boolean
  // Workspace state; null when the message is not in that folder.
  archivedAt?: string | null
  trashedAt?: string | null
  spamAt?: string | null
}

export type MailMessagesPage = {
  items: MailMessage[]
  nextCursor: string | null
}
