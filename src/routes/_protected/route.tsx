import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

import { getCurrentSession } from '#/features/auth/server'

export const Route = createFileRoute('/_protected')({
  headers: () => ({ 'Cache-Control': 'private, no-store' }),
  beforeLoad: async () => {
    const user = await getCurrentSession()
    if (!user) throw redirect({ to: '/login' })
    return { user }
  },
  component: Outlet,
})
