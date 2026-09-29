import { DropdownMenuItem } from '@mailflow/ui/components'

import { useLogout } from './hooks/useLogout'

export function LogoutMenuItem() {
  const { logout, pending } = useLogout()

  return (
    <DropdownMenuItem
      className="cursor-pointer data-[disabled]:cursor-not-allowed"
      disabled={pending}
      onClick={() => void logout()}
    >
      {pending ? 'Signing out…' : 'Sign out'}
    </DropdownMenuItem>
  )
}
