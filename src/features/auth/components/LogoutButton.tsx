import { Button } from '@mailflow/ui/components'

import { useLogout } from '../hooks/useLogout'

export function LogoutButton() {
  const { logout, pending } = useLogout()

  return (
    <Button type="button" variant="outline" disabled={pending} onClick={logout}>
      {pending ? 'Signing out…' : 'Sign out'}
    </Button>
  )
}
