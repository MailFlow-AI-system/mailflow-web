import { Button } from '@mailflow/ui/components'
import { useLogout } from './hooks/useLogout'

export function LogoutButton() {
  const { error, logout, pending } = useLogout()

  return (
    <div>
      <Button type="button" variant="outline" disabled={pending} onClick={logout}>
        {pending ? 'Signing out…' : 'Sign out'}
      </Button>
      {error ? <p role="alert">Unable to sign out. Please try again.</p> : null}
    </div>
  )
}
