import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/_mail/drafts')({ component: DraftsPage })

function DraftsPage() {
  return <h1>Drafts</h1>
}
