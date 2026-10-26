import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { clientEnvironment } from '#/config/env'
import { SentMailList } from '#/features/mail-list/components/SentMailList'
import { WorkspaceMailUnavailable } from '#/features/mail-list/components/WorkspaceMailUnavailable'

const authenticatedRoute = getRouteApi('/_authenticated')
export const Route = createFileRoute('/_authenticated/_mail/sent')({
  component: SentPage,
  head: () => ({ meta: [{ title: 'Enviados' }] }),
})

function SentPage() {
  const { user } = authenticatedRoute.useRouteContext()
  if (clientEnvironment.VITE_WORKSPACE_BASE_HOST) return <WorkspaceMailUnavailable />
  return <SentMailList userId={user.id} />
}
