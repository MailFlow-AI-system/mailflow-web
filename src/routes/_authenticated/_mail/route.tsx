import { createFileRoute, getRouteApi, Outlet, useRouterState } from '@tanstack/react-router'
import { LogoutMenuItem } from '#/features/auth/LogoutMenuItem'
import { useComposerHandlers } from '#/features/email-composer/hooks/useComposerHandlers'
import { MailboxSearch } from '#/features/mail-list/components/MailboxSearch'
import { normalizeMailSearch } from '#/features/mail-list/types/mailSearch'
import { ReaderToolbar } from '#/features/mail-reader/MailReader'
import { WorkspaceBoundary } from '#/features/workspaces/components/WorkspaceBoundary'
import { AppShell } from '@/features/app-shell'
import { EmailComposer } from '@/features/email-composer'

// Mailboxes whose list can be searched; the others keep the inert search field.
const searchableMailboxes = new Set(['/inbox', '/sent', '/drafts'])
const mailRoute = getRouteApi('/_authenticated/_mail')
const authenticatedRoute = getRouteApi('/_authenticated')

export const Route = createFileRoute('/_authenticated/_mail')({
  validateSearch: normalizeMailSearch,
  component: MailLayout,
})

function MailLayout() {
  const { user } = authenticatedRoute.useRouteContext()
  const { message } = mailRoute.useSearch()
  const handlers = useComposerHandlers(user.id)
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  return (
    <EmailComposer.Root key={user.id} userId={user.id} {...handlers}>
      <AppShell.Root>
        <AppShell.Sidebar user={user} userMenu={<LogoutMenuItem />} />
        <AppShell.Main>
          <AppShell.Header>
            <AppShell.Header.Mailbox fullWidth={pathname === '/drafts'}>
              {searchableMailboxes.has(pathname) ? (
                <MailboxSearch userId={user.id} prefetch={pathname === '/inbox'} />
              ) : (
                <AppShell.Header.Search />
              )}
              <AppShell.Header.Filters />
              <EmailComposer.Trigger />
            </AppShell.Header.Mailbox>
            {message && (pathname === '/inbox' || pathname === '/sent') ? (
              <AppShell.Header.Actions className="hidden min-w-0 flex-1 self-start lg:flex">
                <ReaderToolbar />
              </AppShell.Header.Actions>
            ) : null}
          </AppShell.Header>
          <AppShell.Content>
            <WorkspaceBoundary>
              <Outlet />
            </WorkspaceBoundary>
          </AppShell.Content>
        </AppShell.Main>
      </AppShell.Root>
      <EmailComposer.Content>
        <EmailComposer.Header />
        <EmailComposer.Layout assistant={<EmailComposer.Assistant />}>
          <EmailComposer.Fields />
          <EmailComposer.Editor />
          <EmailComposer.Attachments />
          <EmailComposer.Toolbar />
          <EmailComposer.Footer />
        </EmailComposer.Layout>
      </EmailComposer.Content>
      <EmailComposer.Minimized />
      <EmailComposer.CloseConfirmation />
      <EmailComposer.NavigationGuard />
    </EmailComposer.Root>
  )
}
