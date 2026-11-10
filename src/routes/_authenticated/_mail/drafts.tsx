import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { useQueryState } from 'nuqs'
import { useComposer } from '#/features/email-composer'
import { DraftMailList } from '#/features/email-drafts/DraftMailList'
import { MailboxLayout } from '#/features/mail-list/components/MailboxLayout'
import { mailQueryParser } from '#/features/mail-list/types/mailSearch'
import { MailSelectionProvider } from '#/features/mail-selection/components/MailSelectionProvider'
import { useWorkspaceContext } from '#/features/workspaces/hooks/useWorkspaceContext'

const mailRoute = getRouteApi('/_authenticated/_mail')
const authenticatedRoute = getRouteApi('/_authenticated')

export const Route = createFileRoute('/_authenticated/_mail/drafts')({
  component: DraftsPage,
  head: () => ({ meta: [{ title: 'Drafts' }] }),
})

function DraftsPage() {
  const { user } = authenticatedRoute.useRouteContext()
  const workspace = useWorkspaceContext()
  const { q: committedQ } = mailRoute.useSearch()
  const [q] = useQueryState('q', mailQueryParser.withDefault(''))
  const { openDraft } = useComposer()
  const isSearching = q !== (committedQ ?? '')
  const scope = `${user.id}:${workspace?.current?.id ?? 'default'}`
  return (
    <MailSelectionProvider key={scope}>
      {/* Like Gmail, a draft continues in the Composer and the list keeps the whole page. */}
      <MailboxLayout showTitle={false} title="Drafts" fullWidth>
        <DraftMailList
          key={scope}
          heading="Drafts"
          userId={user.id}
          q={q}
          isSearching={isSearching}
          onSelect={(id) => void openDraft?.(id)}
        />
      </MailboxLayout>
    </MailSelectionProvider>
  )
}
