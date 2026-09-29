import { DropdownMenuItem } from '@mailflow/ui/components'

import { useLogout } from './hooks/useLogout'

export function LogoutMenuItem() {
  const { logout, pending } = useLogout()

  return (
    <DropdownMenuItem disabled={pending} onClick={() => void logout()}>
      {pending ? 'Signing out…' : 'Sign out'}
    </DropdownMenuItem>
  )
}
