import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/_mail/inbox')({ component: InboxPage })

function InboxPage() {
  return <h1>Inbox</h1>
}
