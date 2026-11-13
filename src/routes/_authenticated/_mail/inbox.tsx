import { createFileRoute } from '@tanstack/react-router'
import { MailFolderPage, mailFolderHead } from '#/features/mail-list/components/MailFolderPage'

export const inboxHead = mailFolderHead('inbox')

export const Route = createFileRoute('/_authenticated/_mail/inbox')({
  component: () => <MailFolderPage folder="inbox" />,
  head: inboxHead,
})
