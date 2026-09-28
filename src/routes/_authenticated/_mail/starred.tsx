import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/_mail/starred')({ component: StarredPage })

function StarredPage() {
  return <h1>Starred</h1>
}
