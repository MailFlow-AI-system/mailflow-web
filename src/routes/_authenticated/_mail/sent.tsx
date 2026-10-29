import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { parseAsString, useQueryState } from 'nuqs'
import { MailboxLayout } from '#/features/mail-list/components/MailboxLayout'
import { SentMailList } from '#/features/mail-list/components/SentMailList'
import { MailReader } from '#/features/mail-reader/MailReader'
import { useWorkspaceContext } from '#/features/workspaces/hooks/useWorkspaceContext'

const mailRoute = getRouteApi('/_authenticated/_mail')
const authenticatedRoute = getRouteApi('/_authenticated')
export const Route = createFileRoute('/_authenticated/_mail/sent')({
  component: SentPage,
  head: () => ({ meta: [{ title: 'Enviados' }] }),
})

function SentPage() {
  const { user } = authenticatedRoute.useRouteContext()
  const workspace = useWorkspaceContext()
  const { message: selectedId } = mailRoute.useSearch()
  const [, setMessage] = useQueryState(
    'message',
    parseAsString.withOptions({ shallow: false, history: 'push', scroll: false }),
  )
  return (
    <MailboxLayout
      title="Enviados"
      reader={
        selectedId ? (
          <MailReader
            toolbarClassName="lg:hidden"
            key={`${user.id}:${selectedId}`}
            userId={user.id}
            folder="sent"
            id={selectedId}
            onBack={() => void setMessage(null)}
          />
        ) : undefined
      }
    >
      <SentMailList
        key={`${user.id}:${workspace?.current?.id ?? 'default'}`}
        userId={user.id}
        selectedId={selectedId}
        onSelect={(id) => void setMessage(id)}
        onAutoSelect={(id) => void setMessage(id, { history: 'replace' })}
      />
    </MailboxLayout>
  )
}
