import { useNavigate, useRouter } from '@tanstack/react-router'
import { useState } from 'react'

import { recordAuthTransportFailure } from '../../../observability/faro'
import { AUTH_UPSTREAM_UNAVAILABLE } from '../authErrorCodes'
import { authClient } from '../client'

export function useLogout() {
  const navigate = useNavigate()
  const router = useRouter()
  const [error, setError] = useState(false)
  const [pending, setPending] = useState(false)

  async function logout() {
    setError(false)
    setPending(true)
    const authStartedAt = performance.now()
    let authRequestReturned = false
    try {
      const result = await authClient.signOut()
      authRequestReturned = true
      if (result.error) {
        if (result.error.code === AUTH_UPSTREAM_UNAVAILABLE) {
          recordAuthTransportFailure('sign_out', performance.now() - authStartedAt)
        }
        setError(true)
        return
      }
      await router.invalidate()
      await navigate({ to: '/login' })
    } catch (error) {
      if (!authRequestReturned && error instanceof TypeError) {
        recordAuthTransportFailure('sign_out', performance.now() - authStartedAt)
      }
      setError(true)
    } finally {
      setPending(false)
    }
  }

  return { error, logout, pending }
}
