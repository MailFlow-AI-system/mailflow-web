import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { useQueryState } from 'nuqs'

import { MailList } from '#/features/mail-list/components/MailList'
import { mailQueryParser } from '#/features/mail-list/types/mailSearch'

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

  return (
    <div className="flex h-full min-h-0 min-w-0">
      <section
        aria-label="Inbox"
        className="flex min-h-0 w-full min-w-0 flex-col md:w-[29vw] md:max-w-[419px] md:border-r md:border-border"
      >
        <h1 className="px-3 py-3 text-sm font-semibold">Inbox</h1>
        <MailList isSearching={isSearching} q={q} userId={user.id} />
      </section>
      <div aria-hidden="true" className="hidden min-w-0 flex-1 bg-muted/10 md:block" />
    </div>
  )
}

export function inboxHead() {
  return { meta: [{ title: 'Inbox' }] }
}
