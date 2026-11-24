import { noProxySecret, type ProxySecretReader } from '#/features/auth/adapters/clientIpForwarding'
import type { WorkspaceAccess } from '../types/access'
import { resolveWorkspaceHost } from '../utils/workspaceHost'
import { isWorkspaceRequestOrigin } from '../utils/workspaceOrigin'
import { createWorkspaceTransport } from './workspaceTransport'

// Verifies on the server that the signed-in user belongs to this host's workspace. Core answers
// unknown and unauthorized workspaces identically, so `forbidden` never reveals existence.
export async function readWorkspaceAccess(
  request: Request,
  apiBaseUrl: string,
  baseHost: string | undefined,
  enabled: boolean,
  fetcher: typeof fetch = fetch,
  readProxySecret: ProxySecretReader = noProxySecret,
): Promise<WorkspaceAccess> {
  if (!baseHost || !enabled) return { kind: 'passthrough' }
  const url = new URL(request.url)
  const host = resolveWorkspaceHost(url.hostname, baseHost)
  if (!isWorkspaceRequestOrigin(url, baseHost) || host.kind !== 'workspace')
    return { kind: 'invalid' }
  try {
    const upstream = await createWorkspaceTransport(
      apiBaseUrl,
      fetcher,
      readProxySecret,
    )(request, `/api/v1/workspaces/${host.slug}/context`)
    if (upstream.ok) return { kind: 'passthrough' }
    if (upstream.status === 401) return { kind: 'unauthenticated' }
    if (upstream.status === 403 || upstream.status === 404) return { kind: 'forbidden' }
    return { kind: 'error' }
  } catch {
    return { kind: 'error' }
  }
}
