import { createFileRoute, Outlet } from '@tanstack/react-router'

import { LogoutMenuItem } from '#/features/auth/LogoutMenuItem'
import { AppShell } from '@/features/app-shell'
import { EmailComposer } from '@/features/email-composer'

export const Route = createFileRoute('/_authenticated/_mail')({ component: MailLayout })

function MailLayout() {
  return (
    <EmailComposer.Root>
      <AppShell.Root>
        <AppShell.Sidebar userMenu={<LogoutMenuItem />} />
        <AppShell.Main>
          <AppShell.Header>
            <AppShell.Breadcrumbs />
            <AppShell.Header.Actions>
              <EmailComposer.Trigger />
            </AppShell.Header.Actions>
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
