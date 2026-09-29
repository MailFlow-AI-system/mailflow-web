import { createFileRoute, getRouteApi, Outlet } from '@tanstack/react-router'

import { LogoutMenuItem } from '#/features/auth/LogoutMenuItem'
import { AppShell } from '@/features/app-shell'
import { EmailComposer } from '@/features/email-composer'

const authenticatedRoute = getRouteApi('/_authenticated')

export const Route = createFileRoute('/_authenticated/_mail')({ component: MailLayout })

function MailLayout() {
  const { user } = authenticatedRoute.useRouteContext()

  return (
    <EmailComposer.Root>
      <AppShell.Root>
        <AppShell.Sidebar user={user} userMenu={<LogoutMenuItem />} />
        <AppShell.Main>
          <AppShell.Header>
            <AppShell.Header.Mailbox>
              <AppShell.Header.Search />
              <AppShell.Header.Filters />
              <EmailComposer.Trigger />
            </AppShell.Header.Mailbox>
          </AppShell.Header>
          <AppShell.Content>
            <Outlet />
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
