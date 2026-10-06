import {
  workspaceContextSchema,
  workspacePageSchema,
  workspaceSelectionResultSchema,
} from '../schemas'
import { readWorkspaceResponse } from './workspaceAuthority'
export async function selectWorkspace(
  workspaceId: string,
  identityId: string,
  signal: AbortSignal,
) {
  const response = await readWorkspaceResponse('/api/v1/workspace-selection', identityId, signal, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workspaceId }),
  })
  const result = workspaceSelectionResultSchema.parse(response)
  if (result.workspace.id !== workspaceId) throw new Error('Workspace selection failed')
  return result.workspace
}

export async function readWorkspaceContext(userId: string, signal: AbortSignal) {
  return workspaceContextSchema.parse(
    await readWorkspaceResponse('/api/workspace-context', userId, signal),
  )
}
export async function readWorkspacePage(
  userId: string,
  cursor: string | null,
  signal: AbortSignal,
) {
  return workspacePageSchema.parse(
    await readWorkspaceResponse(
      `/api/v1/workspaces${cursor ? `?${new URLSearchParams({ cursor })}` : ''}`,
      userId,
      signal,
    ),
  )
}
