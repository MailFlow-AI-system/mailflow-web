import { createFileRoute, Outlet } from '@tanstack/react-router'

import { requireAuthenticatedUser } from '#/features/auth/routeGuards'
import { WorkspaceProvider } from '#/features/workspaces/components/WorkspaceProvider'

export const Route = createFileRoute('/_authenticated')({
  headers: () => ({ 'Cache-Control': 'private, no-store' }),
  beforeLoad: requireAuthenticatedUser,
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  const { user } = Route.useRouteContext()
  return (
    <WorkspaceProvider key={user.id} userId={user.id}>
      <Outlet />
    </WorkspaceProvider>
  )
}
