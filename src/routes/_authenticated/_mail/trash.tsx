import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/_mail/trash')({ component: TrashPage })

function TrashPage() {
  return <h1>Trash</h1>
}
