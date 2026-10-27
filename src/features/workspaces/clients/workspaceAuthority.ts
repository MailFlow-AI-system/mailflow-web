import { getCurrentSession } from '../../auth/adapters/getCurrentSession'
import { workspaceRetryAfter } from '../utils/workspaceRetryAfter'
import { WorkspaceIdentityChangedError } from './workspaceIdentityChangedError'
import { WorkspaceRateLimitedError } from './workspaceRateLimitedError'

export { WorkspaceIdentityChangedError } from './workspaceIdentityChangedError'

export async function readWorkspaceResponse(
  path: string,
  userId: string,
  signal: AbortSignal,
  init?: RequestInit,
) {
  const headers = new Headers(init?.headers)
  headers.set('X-Workspace-Identity', userId)
  const response = await fetch(path, {
    ...init,
    headers,
    credentials: 'same-origin',
    cache: 'no-store',
    signal,
  })
  if (response.status === 401) throw new WorkspaceIdentityChangedError()
  const identity = response.headers.get('x-workspace-identity')
  if (identity && identity !== userId) throw new WorkspaceIdentityChangedError()
  if (response.status === 429)
    throw new WorkspaceRateLimitedError(workspaceRetryAfter(response.headers.get('retry-after')))
  if (!response.ok) throw new Error('Workspace request failed')
  if (!identity) throw new Error('Workspace identity could not be verified')
  const data: unknown = await response.json()
  signal.throwIfAborted()

  // Recheck after receiving the body: a response may have been delayed across logout.
  const current = await getCurrentSession({ signal })
  if (!current || current.id !== userId) throw new WorkspaceIdentityChangedError()
  signal.throwIfAborted()
  return data
}
