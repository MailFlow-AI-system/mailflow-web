import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { parseAsString, useQueryState } from 'nuqs'
import { MailboxLayout } from '#/features/mail-list/components/MailboxLayout'
import { MailList } from '#/features/mail-list/components/MailList'
import { mailQueryParser } from '#/features/mail-list/types/mailSearch'
import { MailReader } from '#/features/mail-reader/MailReader'
import { useWorkspaceContext } from '#/features/workspaces/hooks/useWorkspaceContext'

const authenticatedRoute = getRouteApi('/_authenticated')
const mailRoute = getRouteApi('/_authenticated/_mail')

export const Route = createFileRoute('/_authenticated/_mail/inbox')({
  component: InboxPage,
  head: inboxHead,
})

function InboxPage() {
  const { user } = authenticatedRoute.useRouteContext()
  const { q: committedQ, message: selectedId } = mailRoute.useSearch()
  const [, setMessage] = useQueryState(
    'message',
    parseAsString.withOptions({ shallow: false, history: 'push', scroll: false }),
  )
  const [q] = useQueryState('q', mailQueryParser.withDefault(''))
  const isSearching = q !== (committedQ ?? '')
  const workspace = useWorkspaceContext()
  if (!workspace?.current) return <p>Open a workspace address</p>

  return (
    <MailboxLayout
      title="Inbox"
      reader={
        selectedId ? (
          <MailReader
            toolbarClassName="lg:hidden"
            key={`${user.id}:${workspace.current.id}:${selectedId}`}
            userId={user.id}
            folder="messages"
            id={selectedId}
            onBack={() => void setMessage(null)}
          />
        ) : undefined
      }
    >
      <MailList
        key={`${user.id}:${workspace.current.id}`}
        workspaceSlug={workspace.current.slug}
        selectedId={selectedId}
        onSelect={(id) => void setMessage(id)}
        onAutoSelect={(id) => void setMessage(id, { history: 'replace' })}
        isSearching={isSearching}
        q={q}
        userId={user.id}
      />
    </MailboxLayout>
  )
}

export function inboxHead() {
  return { meta: [{ title: 'Inbox' }] }
}
