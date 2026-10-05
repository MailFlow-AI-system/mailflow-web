import {
  workspaceContextSchema,
  workspacePageSchema,
  workspaceSelectionResultSchema,
} from '../schemas'

async function read(path: string, signal: AbortSignal) {
  const response = await fetch(path, { credentials: 'same-origin', cache: 'no-store', signal })
  if (!response.ok) throw new Error('Workspace request failed')
  return response.json()
}
export async function selectWorkspace(workspaceId: string, signal: AbortSignal) {
  const response = await fetch('/api/v1/workspace-selection', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workspaceId }),
  })
  if (!response.ok) throw new Error('Workspace selection failed')
  const result = workspaceSelectionResultSchema.parse(await response.json())
  if (result.workspace.id !== workspaceId) throw new Error('Workspace selection failed')
  return result.workspace
}

export async function readWorkspaceContext(signal: AbortSignal) {
  return workspaceContextSchema.parse(await read('/api/workspace-context', signal))
}
export async function readWorkspacePage(cursor: string | null, signal: AbortSignal) {
  return workspacePageSchema.parse(
    await read(`/api/v1/workspaces${cursor ? `?${new URLSearchParams({ cursor })}` : ''}`, signal),
  )
}
