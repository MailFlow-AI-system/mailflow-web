import { toast } from '@mailflow/ui/components'
import { useNavigate, useRouter } from '@tanstack/react-router'
import { useState } from 'react'

import { recordAuthTransportFailure } from '../../../observability/faro'
import { AUTH_UPSTREAM_UNAVAILABLE } from '../authErrorCodes'
import { authClient } from '../client'

export function useLogout() {
  const navigate = useNavigate()
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function logout() {
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
        toast.error('Unable to sign out. Please try again.')
        return
      }
      await router.invalidate()
      await navigate({ to: '/login' })
    } catch (error) {
      if (!authRequestReturned && error instanceof TypeError) {
        recordAuthTransportFailure('sign_out', performance.now() - authStartedAt)
      }
      toast.error('Unable to sign out. Please try again.')
    } finally {
      setPending(false)
    }
  }

  return { logout, pending }
}
