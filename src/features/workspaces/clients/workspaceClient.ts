import { workspaceContextSchema, workspacePageSchema } from '../schemas'

async function read(path: string, signal: AbortSignal) {
  const response = await fetch(path, { credentials: 'same-origin', cache: 'no-store', signal })
  if (!response.ok) throw new Error('Workspace request failed')
  return response.json()
}

export async function readWorkspaceContext(signal: AbortSignal) {
  return workspaceContextSchema.parse(await read('/api/workspace-context', signal))
}
export async function readWorkspacePage(cursor: string | null, signal: AbortSignal) {
  return workspacePageSchema.parse(
    await read(`/api/v1/workspaces${cursor ? `?${new URLSearchParams({ cursor })}` : ''}`, signal),
  )
}
