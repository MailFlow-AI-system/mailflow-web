import { getRouteApi } from '@tanstack/react-router'
import { parseAsString, useQueryState } from 'nuqs'
import { MailReader } from '#/features/mail-reader/MailReader'
import { MailSelectionProvider } from '#/features/mail-selection/components/MailSelectionProvider'
import { useWorkspaceContext } from '#/features/workspaces/hooks/useWorkspaceContext'
import type { MailFolderName } from '../types/mailFolder'
import { mailQueryParser } from '../types/mailSearch'
import { MailboxLayout } from './MailboxLayout'
import { MailList } from './MailList'

const authenticatedRoute = getRouteApi('/_authenticated')
const mailRoute = getRouteApi('/_authenticated/_mail')

export const mailFolderTitles: Record<MailFolderName, string> = {
  inbox: 'Inbox',
  starred: 'Starred',
  archive: 'Archive',
  spam: 'Spam',
  trash: 'Trash',
}

// One page for every workspace folder: a list beside the reader for the open message.
export function MailFolderPage({ folder }: { folder: MailFolderName }) {
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
  const title = mailFolderTitles[folder]
  const scope = `${user.id}:${workspace.current.id}:${workspace.current.slug}:${folder}`

  return (
    <MailSelectionProvider key={scope}>
      <MailboxLayout
        showTitle={false}
        title={title}
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
          key={scope}
          folder={folder}
          heading={title}
          workspaceSlug={workspace.current.slug}
          selectedId={selectedId}
          onSelect={(id) => void setMessage(id)}
          onAutoSelect={(id) => void setMessage(id, { history: 'replace' })}
          isSearching={isSearching}
          q={q}
          userId={user.id}
        />
      </MailboxLayout>
    </MailSelectionProvider>
  )
}

export function mailFolderHead(folder: MailFolderName) {
  return () => ({ meta: [{ title: mailFolderTitles[folder] }] })
}
