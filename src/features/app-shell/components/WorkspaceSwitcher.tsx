import { clientEnvironment } from '#/config/env'
import { useComposerNavigationGuard } from '#/features/email-composer'
import { WorkspaceSelectionConfirmation } from '#/features/workspaces/components/WorkspaceSelectionConfirmation'
import { WorkspaceSelector } from '#/features/workspaces/components/WorkspaceSelector'
import { useWorkspaceContext } from '#/features/workspaces/hooks/useWorkspaceContext'
import { useWorkspaceSelection } from '#/features/workspaces/hooks/useWorkspaceSelection'
import type { WorkspaceSwitcherProps } from '#/features/workspaces/types'

export function WorkspaceSwitcher() {
  const state = useWorkspaceContext()
  if (!state) return null
  return <WorkspaceSwitcherControl state={state} />
}

function WorkspaceSwitcherControl({ state }: WorkspaceSwitcherProps) {
  const composer = useComposerNavigationGuard()
  const enabled = clientEnvironment.VITE_WORKSPACE_LOCAL_SWITCHING_ENABLED
  const selection = useWorkspaceSelection({
    state,
    composer,
    enabled,
    baseHost: clientEnvironment.VITE_WORKSPACE_BASE_HOST,
  })
  return (
    <>
      <WorkspaceSelector
        state={state}
        onSelect={enabled ? selection.request : undefined}
        busy={selection.busy}
        selectionError={selection.error}
      />
      <WorkspaceSelectionConfirmation
        workspace={selection.confirmation}
        busy={selection.busy}
        error={selection.error}
        retryAfterSeconds={selection.retryAfterSeconds}
        theme={composer?.theme}
        onCancel={selection.cancel}
        onConfirm={selection.confirm}
      />
    </>
  )
}
