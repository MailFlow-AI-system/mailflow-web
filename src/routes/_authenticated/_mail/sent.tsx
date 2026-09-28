import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/_mail/sent')({ component: SentPage })

function SentPage() {
  return <h1>Sent</h1>
}
