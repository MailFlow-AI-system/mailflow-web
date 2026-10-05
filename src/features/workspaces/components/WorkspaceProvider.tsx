import { clientEnvironment } from '#/config/env'
import { WorkspaceContext } from '../hooks/useWorkspaceContext'
import { useWorkspaceData } from '../hooks/useWorkspaceData'
import type { WorkspaceProviderProps } from '../types'

export function WorkspaceProvider({ userId, children }: WorkspaceProviderProps) {
  const value = useWorkspaceData(userId, Boolean(clientEnvironment.VITE_WORKSPACE_BASE_HOST))
  return <WorkspaceContext value={value}>{children}</WorkspaceContext>
}
