import { createFileRoute, Outlet, redirect, useRouter } from '@tanstack/react-router'
import { clientEnvironment } from '#/config/env'
import { LogoutButton } from '#/features/auth/components/LogoutButton'
import { requireAuthenticatedUser } from '#/features/auth/routeGuards'
import { workspaceLoginDestination } from '#/features/auth/utils/authNavigation'
import { resolveWorkspaceAccess } from '#/features/workspaces/adapters/resolveWorkspaceAccess'
import { WorkspaceEntryBoundary } from '#/features/workspaces/components/WorkspaceEntryBoundary'
import { WorkspaceProvider } from '#/features/workspaces/components/WorkspaceProvider'

export const Route = createFileRoute('/_authenticated')({
  headers: () => ({ 'Cache-Control': 'private, no-store' }),
  beforeLoad: async ({ location }) => {
    const { user } = await requireAuthenticatedUser({
      location,
      clearFragment: clientEnvironment.workspaceSwitchingEnabled,
    })
    // Each workspace host only serves members of its own workspace.
    const access = await resolveWorkspaceAccess(
      clientEnvironment.VITE_WORKSPACE_BASE_HOST,
      clientEnvironment.workspaceSwitchingEnabled,
    )
    if (access.kind === 'unauthenticated')
      throw redirect({
        href: workspaceLoginDestination(location.pathname),
        replace: true,
        reloadDocument: true,
      })
    return { user, workspaceAccess: access.kind }
  },
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  const { user, workspaceAccess } = Route.useRouteContext()
  const router = useRouter()
  return (
    <WorkspaceEntryBoundary
      kind={workspaceAccess}
      accountAction={<LogoutButton />}
      retry={() => {
        void router.invalidate()
      }}
    >
      <WorkspaceProvider key={user.id} userId={user.id}>
        <Outlet />
      </WorkspaceProvider>
    </WorkspaceEntryBoundary>
  )
}
