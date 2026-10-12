import { useEffect, useRef, useState } from 'react'
import { WorkspaceIdentityChangedError } from '../clients/workspaceAuthority'
import { selectWorkspace } from '../clients/workspaceClient'
import { WorkspaceRateLimitedError } from '../clients/workspaceRateLimitedError'
import type { Workspace } from '../types'
import type { WorkspaceSelectionOptions } from '../types/selection'
import { workspaceDestination } from '../utils/workspaceNavigation'
import { useWorkspaceIdentityRecovery } from './useWorkspaceIdentityRecovery'

export function useWorkspaceSelection({ state, baseHost, enabled }: WorkspaceSelectionOptions) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryAfterSeconds, setRetryAfterSeconds] = useState<number | null>(null)
  const [identityError, setIdentityError] = useState<Error | null>(null)
  useWorkspaceIdentityRecovery(identityError)
  const active = useRef<AbortController | null>(null)
  useEffect(
    () => () => {
      active.current?.abort()
    },
    [],
  )

  async function perform(workspace: Workspace) {
    if (active.current || !enabled || !baseHost) return
    const controller = new AbortController()
    active.current = controller
    setBusy(true)
    setError(null)
    setRetryAfterSeconds(null)
    let navigating = false
    try {
      // Check our source and proposed destination before committing anything.
      workspaceDestination(window.location.href, baseHost, workspace)
      const authorized = await selectWorkspace(workspace.id, state.identityId, controller.signal)
      if (controller.signal.aborted) return
      const destination = workspaceDestination(window.location.href, baseHost, authorized)
      window.location.assign(destination)
      navigating = true
    } catch (failure) {
      if (!controller.signal.aborted) {
        if (failure instanceof WorkspaceIdentityChangedError) {
          setIdentityError(failure)
          setError('Your session changed. Reopening this workspace safely.')
        } else if (failure instanceof WorkspaceRateLimitedError) {
          setRetryAfterSeconds(failure.retryAfterSeconds)
          const wait = failure.retryAfterSeconds
            ? `Try again in ${failure.retryAfterSeconds} seconds.`
            : 'Please wait before trying again.'
          setError(`Too many workspace requests. ${wait}`)
        } else {
          setError('Workspace could not be changed. Try again.')
        }
      }
    } finally {
      if (!navigating) {
        active.current = null
        if (!controller.signal.aborted) setBusy(false)
      }
    }
  }

  function request(workspaceId: string | null) {
    if (
      !enabled ||
      active.current ||
      !workspaceId ||
      state.status !== 'ready' ||
      workspaceId === state.current?.id
    )
      return
    const workspace = state.items.find((item) => item.id === workspaceId)
    if (!workspace) return
    setError(null)
    setRetryAfterSeconds(null)
    void perform(workspace)
  }

  return {
    request,
    busy,
    error,
    retryAfterSeconds,
  }
}
