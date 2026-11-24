import { getCurrentSession } from '../../auth/adapters/getCurrentSession'
import {
  workspaceContextSchema,
  workspaceHandoffResultSchema,
  workspacePageSchema,
} from '../schemas'
import { workspaceRetryAfter } from '../utils/workspaceRetryAfter'
import { readWorkspaceResponse, WorkspaceIdentityChangedError } from './workspaceAuthority'
import { WorkspaceRateLimitedError } from './workspaceRateLimitedError'
// Asks Core for a one-time code that signs this user in on the target workspace host.
export async function issueWorkspaceHandoff(
  workspaceId: string,
  identityId: string,
  signal: AbortSignal,
) {
  const response = await fetch('/api/auth/workspace-handoff/issue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ workspaceId }),
    credentials: 'same-origin',
    cache: 'no-store',
    signal,
  })
  if (response.status === 401) throw new WorkspaceIdentityChangedError()
  if (response.status === 429)
    throw new WorkspaceRateLimitedError(
      workspaceRetryAfter(
        response.headers.get('retry-after') ?? response.headers.get('x-retry-after'),
      ),
    )
  if (!response.ok) throw new Error('Workspace handoff failed')
  const { url } = workspaceHandoffResultSchema.parse(await response.json())
  signal.throwIfAborted()
  // A logout or another sign-in may have happened while the code was issued. Never carry the
  // previous identity to another host after that.
  const current = await getCurrentSession({ signal })
  if (!current || current.id !== identityId) throw new WorkspaceIdentityChangedError()
  signal.throwIfAborted()
  return url
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
