import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { useQueryState } from 'nuqs'
import { clientEnvironment } from '#/config/env'

import { MailboxLayout } from '#/features/mail-list/components/MailboxLayout'
import { MailList } from '#/features/mail-list/components/MailList'
import { WorkspaceMailUnavailable } from '#/features/mail-list/components/WorkspaceMailUnavailable'
import { mailQueryParser } from '#/features/mail-list/types/mailSearch'

const authenticatedRoute = getRouteApi('/_authenticated')
const mailRoute = getRouteApi('/_authenticated/_mail')

export const Route = createFileRoute('/_authenticated/_mail/inbox')({
  component: InboxPage,
  head: inboxHead,
})

function InboxPage() {
  if (clientEnvironment.VITE_WORKSPACE_BASE_HOST) return <WorkspaceMailUnavailable />
  return <LegacyInboxPage />
}

function LegacyInboxPage() {
  const { user } = authenticatedRoute.useRouteContext()
  const { q: committedQ } = mailRoute.useSearch()
  const [q] = useQueryState('q', mailQueryParser.withDefault(''))
  const isSearching = q !== (committedQ ?? '')

  return (
    <MailboxLayout title="Inbox">
      <MailList isSearching={isSearching} q={q} userId={user.id} />
    </MailboxLayout>
  )
}

export function inboxHead() {
  return { meta: [{ title: 'Inbox' }] }
}
