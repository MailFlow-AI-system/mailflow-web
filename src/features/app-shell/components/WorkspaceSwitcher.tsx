import { WorkspaceSelector } from '#/features/workspaces/components/WorkspaceSelector'
import { useWorkspaceContext } from '#/features/workspaces/hooks/useWorkspaceContext'

export function WorkspaceSwitcher() {
  const state = useWorkspaceContext()
  if (!state) return null
  return <WorkspaceSelector state={state} />
}
