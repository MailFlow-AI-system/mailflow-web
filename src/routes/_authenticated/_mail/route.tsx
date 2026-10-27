import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute, getRouteApi, Outlet, useRouterState } from '@tanstack/react-router'
import { useCallback } from 'react'
import { clientEnvironment } from '#/config/env'
import { LogoutMenuItem } from '#/features/auth/LogoutMenuItem'
import { sendEmail } from '#/features/email-composer/clients/sendEmail'
import { MailboxSearch } from '#/features/mail-list/components/MailboxSearch'
import { normalizeMailSearch } from '#/features/mail-list/types/mailSearch'
import { WorkspaceBoundary } from '#/features/workspaces/components/WorkspaceBoundary'
import { AppShell } from '@/features/app-shell'
import { EmailComposer } from '@/features/email-composer'

const authenticatedRoute = getRouteApi('/_authenticated')

export const Route = createFileRoute('/_authenticated/_mail')({
  validateSearch: normalizeMailSearch,
  component: MailLayout,
})

function MailLayout() {
  const { user } = authenticatedRoute.useRouteContext()
  const queryClient = useQueryClient()
  const onSent = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['sent-emails', user.id] })
  }, [queryClient, user.id])
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  return (
    <EmailComposer.Root key={user.id} userId={user.id} onSend={sendEmail} onSent={onSent}>
      <AppShell.Root>
        <AppShell.Sidebar user={user} userMenu={<LogoutMenuItem />} />
        <AppShell.Main>
          <AppShell.Header>
            <AppShell.Header.Mailbox>
              {pathname === '/inbox' && !clientEnvironment.VITE_WORKSPACE_BASE_HOST ? (
                <MailboxSearch userId={user.id} />
              ) : (
                <AppShell.Header.Search />
              )}
              <AppShell.Header.Filters />
              <EmailComposer.Trigger />
            </AppShell.Header.Mailbox>
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
    </EmailComposer.Root>
  )
}
