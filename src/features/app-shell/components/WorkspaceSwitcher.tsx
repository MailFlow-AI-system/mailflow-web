import { clientEnvironment } from '#/config/env'
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
  const enabled = clientEnvironment.workspaceSwitchingEnabled
  const selection = useWorkspaceSelection({
    state,
    enabled,
    baseHost: clientEnvironment.VITE_WORKSPACE_BASE_HOST,
  })
  return (
    <WorkspaceSelector
      state={state}
      onSelect={enabled ? selection.request : undefined}
      busy={selection.busy}
      selectionError={selection.error}
    />
  )
}
