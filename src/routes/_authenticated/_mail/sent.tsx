import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { parseAsString, useQueryState } from 'nuqs'
import { MailboxLayout } from '#/features/mail-list/components/MailboxLayout'
import { SentMailList } from '#/features/mail-list/components/SentMailList'
import { mailQueryParser } from '#/features/mail-list/types/mailSearch'
import { MailReader } from '#/features/mail-reader/MailReader'
import { MailSelectionProvider } from '#/features/mail-selection/components/MailSelectionProvider'
import { useWorkspaceContext } from '#/features/workspaces/hooks/useWorkspaceContext'

const mailRoute = getRouteApi('/_authenticated/_mail')
const authenticatedRoute = getRouteApi('/_authenticated')
export const Route = createFileRoute('/_authenticated/_mail/sent')({
  component: SentPage,
  head: () => ({ meta: [{ title: 'Sent' }] }),
})

function SentPage() {
  const { user } = authenticatedRoute.useRouteContext()
  const workspace = useWorkspaceContext()
  const { q: committedQ, message: selectedId } = mailRoute.useSearch()
  const [, setMessage] = useQueryState(
    'message',
    parseAsString.withOptions({ shallow: false, history: 'push', scroll: false }),
  )
  const [q] = useQueryState('q', mailQueryParser.withDefault(''))
  const isSearching = q !== (committedQ ?? '')
  const scope = `${user.id}:${workspace?.current?.id ?? 'default'}`
  return (
    <MailSelectionProvider key={scope}>
      <MailboxLayout
        showTitle={false}
        title="Sent"
        reader={
          selectedId ? (
            <MailReader
              toolbarClassName="lg:hidden"
              key={`${scope}:${selectedId}`}
              userId={user.id}
              folder="sent"
              id={selectedId}
              onBack={() => void setMessage(null)}
            />
          ) : undefined
        }
      >
        <SentMailList
          key={scope}
          heading="Sent"
          userId={user.id}
          q={q}
          isSearching={isSearching}
          selectedId={selectedId}
          onSelect={(id) => void setMessage(id)}
          onAutoSelect={(id) => void setMessage(id, { history: 'replace' })}
        />
      </MailboxLayout>
    </MailSelectionProvider>
  )
}
