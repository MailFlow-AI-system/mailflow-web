import { toast } from '@mailflow/ui/components'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { clientEnvironment } from '#/config/env'

import { recordAuthTransportFailure } from '../../../observability/faro'
import { AUTH_UPSTREAM_UNAVAILABLE } from '../authErrorCodes'
import { authClient } from '../clients/authClient'

export function useLogout() {
  const queryClient = useQueryClient()
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
      await queryClient.cancelQueries()
      queryClient.clear()
      if (clientEnvironment.workspaceSwitchingEnabled) {
        await navigate({ href: '/login#', replace: true, reloadDocument: true })
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
