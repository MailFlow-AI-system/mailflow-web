import { createFileRoute } from '@tanstack/react-router'
import { MailFolderPage, mailFolderHead } from '#/features/mail-list/components/MailFolderPage'

export const Route = createFileRoute('/_authenticated/_mail/trash')({
  component: () => <MailFolderPage folder="trash" />,
  head: mailFolderHead('trash'),
})
