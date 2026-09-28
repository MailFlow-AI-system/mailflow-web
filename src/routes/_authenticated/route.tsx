import { createFileRoute, Outlet } from '@tanstack/react-router'

import { requireAuthenticatedUser } from '#/features/auth/routeGuards'

export const Route = createFileRoute('/_authenticated')({
  headers: () => ({ 'Cache-Control': 'private, no-store' }),
  beforeLoad: requireAuthenticatedUser,
  component: Outlet,
})
