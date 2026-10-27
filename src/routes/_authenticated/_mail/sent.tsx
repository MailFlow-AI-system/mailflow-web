import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { MailboxLayout } from '#/features/mail-list/components/MailboxLayout'
import { SentMailList } from '#/features/mail-list/components/SentMailList'

const authenticatedRoute = getRouteApi('/_authenticated')
export const Route = createFileRoute('/_authenticated/_mail/sent')({
  component: SentPage,
  head: () => ({ meta: [{ title: 'Enviados' }] }),
})

function SentPage() {
  const { user } = authenticatedRoute.useRouteContext()
  return (
    <MailboxLayout title="Enviados">
      <SentMailList userId={user.id} />
    </MailboxLayout>
  )
}
