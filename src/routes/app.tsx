import { createFileRoute, Outlet } from '@tanstack/react-router'

import { AppShell } from '../features/app-shell'

export const Route = createFileRoute('/app')({ component: ApplicationLayout })

function ApplicationLayout() {
  return (
    <AppShell.Root>
      <AppShell.Sidebar />
      <AppShell.Main>
        <AppShell.Header>
          <AppShell.Breadcrumbs />
        </AppShell.Header>
        <AppShell.Content>
          <Outlet />
        </AppShell.Content>
      </AppShell.Main>
    </AppShell.Root>
  )
}
