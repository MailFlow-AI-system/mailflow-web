import { redirect } from '@tanstack/react-router'

import { getCurrentSession } from './adapters/getCurrentSession'
import type { AuthenticatedNavigation, LoginNavigation } from './types/AuthNavigation'
import { safeMailCollectionPath, workspaceLoginDestination } from './utils/authNavigation'

export async function redirectRootEntry(): Promise<never> {
  const user = await getCurrentSession()
  throw redirect({ to: user ? '/inbox' : '/login', replace: true })
}

export async function redirectAuthenticatedLogin(navigation?: LoginNavigation): Promise<void> {
  const user = await getCurrentSession()
  if (user)
    throw redirect({ to: safeMailCollectionPath(navigation?.search.returnTo), replace: true })
}

export async function requireAuthenticatedUser(navigation?: AuthenticatedNavigation) {
  const user = await getCurrentSession()
  if (!user) {
    if (navigation?.clearFragment)
      throw redirect({
        href: workspaceLoginDestination(navigation.location.pathname),
        replace: true,
        reloadDocument: true,
      })
    const returnTo = safeMailCollectionPath(navigation?.location.pathname)
    throw redirect({
      to: '/login',
      replace: true,
      ...(returnTo !== '/inbox' ? { search: { returnTo } } : {}),
    })
  }
  return { user }
}
