import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { safeMailCollectionPath } from '../../auth/utils/authNavigation'
import { WorkspaceIdentityChangedError } from '../clients/workspaceIdentityChangedError'

export function useWorkspaceIdentityRecovery(error: Error | null) {
  const queryClient = useQueryClient()
  const recovering = useRef(false)
  useEffect(() => {
    if (!(error instanceof WorkspaceIdentityChangedError) || recovering.current) return
    recovering.current = true
    void queryClient.cancelQueries().then(() => {
      queryClient.clear()
      window.location.replace(`${safeMailCollectionPath(window.location.pathname)}#`)
    })
  }, [error, queryClient])
}
