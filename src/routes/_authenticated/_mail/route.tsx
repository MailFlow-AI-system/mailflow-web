import { createFileRoute, getRouteApi, Outlet, useRouterState } from '@tanstack/react-router'
import { LogoutMenuItem } from '#/features/auth/LogoutMenuItem'
import { useComposerHandlers } from '#/features/email-composer/hooks/useComposerHandlers'
import { MailFolderActions } from '#/features/mail-actions/components/MailFolderActions'
import { ReaderMessageActions } from '#/features/mail-actions/components/ReaderMessageActions'
import { useUnreadCounts } from '#/features/mail-actions/hooks/useUnreadCounts'
import { MailboxSearch } from '#/features/mail-list/components/MailboxSearch'
import { normalizeMailSearch } from '#/features/mail-list/types/mailSearch'
import { ReaderToolbar } from '#/features/mail-reader/MailReader'
import { WorkspaceBoundary } from '#/features/workspaces/components/WorkspaceBoundary'
import { useWorkspaceContext } from '#/features/workspaces/hooks/useWorkspaceContext'
import { AppShell } from '@/features/app-shell'
import { EmailComposer } from '@/features/email-composer'

// Mailboxes whose list can be searched; the others keep the inert search field.
const folderMailboxes = new Set(['/inbox', '/starred', '/archive', '/spam', '/trash'])
const searchableMailboxes = new Set([...folderMailboxes, '/sent', '/drafts'])
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
  const workspace = useWorkspaceContext()
  const badges = useUnreadCounts(user.id, workspace?.current?.slug)

  return (
    <EmailComposer.Root key={user.id} userId={user.id} {...handlers}>
      <AppShell.Root>
        <AppShell.Sidebar user={user} userMenu={<LogoutMenuItem />} badges={badges} />
        <MailFolderActions userId={user.id} pathname={pathname}>
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
              {message && (folderMailboxes.has(pathname) || pathname === '/sent') ? (
                <AppShell.Header.Actions className="hidden min-w-0 flex-1 self-start lg:flex">
                  <ReaderToolbar
                    messageActions={
                      folderMailboxes.has(pathname) ? (
                        <ReaderMessageActions userId={user.id} id={message} />
                      ) : undefined
                    }
                  />
                </AppShell.Header.Actions>
              ) : null}
            </AppShell.Header>
            <AppShell.Content>
              <WorkspaceBoundary>
                <Outlet />
              </WorkspaceBoundary>
            </AppShell.Content>
          </AppShell.Main>
        </MailFolderActions>
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
