import { redirect } from '@tanstack/react-router'

import { getCurrentSession } from './adapters/getCurrentSession'

export async function redirectRootEntry(): Promise<never> {
  const user = await getCurrentSession()
  throw redirect({ to: user ? '/inbox' : '/login', replace: true })
}

export async function redirectAuthenticatedLogin(): Promise<void> {
  const user = await getCurrentSession()
  if (user) throw redirect({ to: '/inbox', replace: true })
}

export async function requireAuthenticatedUser() {
  const user = await getCurrentSession()
  if (!user) throw redirect({ to: '/login', replace: true })
  return { user }
}
