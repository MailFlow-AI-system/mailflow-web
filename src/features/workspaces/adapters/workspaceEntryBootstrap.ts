import { workspaceEntrySchema } from '../schemas'
import type { WorkspaceEntry, WorkspaceEntryBootstrap } from '../types/entry'
import { resolveWorkspaceHost } from '../utils/workspaceHost'
import { workspaceDestination } from '../utils/workspaceNavigation'
import { createWorkspaceEntryGateway } from './workspaceEntryGateway'

export async function readWorkspaceEntryBootstrap(
  request: Request,
  pathname: string,
  apiBaseUrl: string,
  baseHost: string | undefined,
  enabled: boolean,
  fetcher: typeof fetch = fetch,
): Promise<WorkspaceEntryBootstrap> {
  if (!baseHost || !enabled) return { kind: 'passthrough' }
  const url = new URL(request.url)
  const host = resolveWorkspaceHost(url.hostname, baseHost)
  if (host.kind === 'invalid') return { kind: 'invalid' }
  if (host.kind === 'workspace') return { kind: 'passthrough' }
  const response = await createWorkspaceEntryGateway(
    apiBaseUrl,
    baseHost,
    enabled,
    fetcher,
  )(
    new Request(new URL('/api/v1/workspace-entry', url), {
      headers: request.headers,
      signal: request.signal,
    }),
  )
  if (response.status === 401) return { kind: 'unauthenticated' }
  if (!response.ok) return { kind: 'error' }
  const entry: WorkspaceEntry = workspaceEntrySchema.parse(await response.json())
  if (!entry.workspace) return { kind: 'empty' }
  url.pathname = pathname
  // Explicit empty fragments prevent HTTP redirects inheriting private source fragments.
  return { kind: 'redirect', href: `${workspaceDestination(url.href, baseHost, entry.workspace)}#` }
}
