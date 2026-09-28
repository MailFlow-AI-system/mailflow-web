import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/_mail/spam')({ component: SpamPage })

function SpamPage() {
  return <h1>Spam</h1>
}
