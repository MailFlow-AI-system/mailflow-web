import { createFileRoute, Outlet, redirect, useRouter } from '@tanstack/react-router'
import { clientEnvironment } from '#/config/env'
import { LogoutButton } from '#/features/auth/components/LogoutButton'
import { requireAuthenticatedUser } from '#/features/auth/routeGuards'
import { workspaceLoginDestination } from '#/features/auth/utils/authNavigation'
import { resolveWorkspaceEntry } from '#/features/workspaces/adapters/resolveWorkspaceEntry'
import { WorkspaceEntryBoundary } from '#/features/workspaces/components/WorkspaceEntryBoundary'
import { WorkspaceProvider } from '#/features/workspaces/components/WorkspaceProvider'

export const Route = createFileRoute('/_authenticated')({
  headers: () => ({ 'Cache-Control': 'private, no-store' }),
  beforeLoad: async ({ location }) => {
    const { user } = await requireAuthenticatedUser({
      location,
      clearFragment: clientEnvironment.VITE_WORKSPACE_LOCAL_SWITCHING_ENABLED,
    })
    const entry = await resolveWorkspaceEntry(
      location.pathname,
      clientEnvironment.VITE_WORKSPACE_BASE_HOST,
      clientEnvironment.VITE_WORKSPACE_LOCAL_SWITCHING_ENABLED,
    )
    if (entry.kind === 'redirect')
      throw redirect({ href: entry.href, reloadDocument: true, replace: true })
    if (entry.kind === 'unauthenticated')
      throw redirect({
        href: workspaceLoginDestination(location.pathname),
        replace: true,
        reloadDocument: true,
      })
    return { user, workspaceEntryKind: entry.kind }
  },
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  const { user, workspaceEntryKind } = Route.useRouteContext()
  const router = useRouter()
  return (
    <WorkspaceEntryBoundary
      kind={workspaceEntryKind}
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
