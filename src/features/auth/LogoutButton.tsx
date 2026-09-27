import { Button } from '@mailflow/ui/components'
import { useNavigate, useRouter } from '@tanstack/react-router'
import { useState } from 'react'

import { authClient } from './client'

export function LogoutButton() {
  const navigate = useNavigate()
  const router = useRouter()
  const [error, setError] = useState(false)
  const [pending, setPending] = useState(false)

  async function logout() {
    setError(false)
    setPending(true)
    try {
      const result = await authClient.signOut()
      if (result.error) {
        setError(true)
        return
      }
      await router.invalidate()
      await navigate({ to: '/login' })
    } catch {
      setError(true)
    } finally {
      setPending(false)
    }
  }

  return (
    <div>
      <Button type="button" variant="outline" disabled={pending} onClick={logout}>
        {pending ? 'Signing out…' : 'Sign out'}
      </Button>
      {error ? <p role="alert">Unable to sign out. Please try again.</p> : null}
    </div>
  )
}
