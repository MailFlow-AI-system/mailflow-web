import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { useQueryState } from 'nuqs'
import { MailboxLayout } from '#/features/mail-list/components/MailboxLayout'
import { MailList } from '#/features/mail-list/components/MailList'
import { mailQueryParser } from '#/features/mail-list/types/mailSearch'
import { MailSelectionProvider } from '#/features/mail-selection/components/MailSelectionProvider'
import { useWorkspaceContext } from '#/features/workspaces/hooks/useWorkspaceContext'

const authenticatedRoute = getRouteApi('/_authenticated')
const mailRoute = getRouteApi('/_authenticated/_mail')

export const Route = createFileRoute('/_authenticated/_mail/inbox')({
  component: InboxPage,
  head: inboxHead,
})

function InboxPage() {
  const { user } = authenticatedRoute.useRouteContext()
  const { q: committedQ } = mailRoute.useSearch()
  const [q] = useQueryState('q', mailQueryParser.withDefault(''))
  const isSearching = q !== (committedQ ?? '')
  const workspace = useWorkspaceContext()
  if (!workspace?.current) return <p>Open a workspace address</p>

  return (
    <MailSelectionProvider key={`${user.id}:${workspace.current.slug}`}>
      <MailboxLayout showTitle={false} title="Inbox">
        <MailList
          heading="Inbox"
          workspaceSlug={workspace.current.slug}
          isSearching={isSearching}
          q={q}
          userId={user.id}
        />
      </MailboxLayout>
    </MailSelectionProvider>
  )
}

export function inboxHead() {
  return { meta: [{ title: 'Inbox' }] }
}
