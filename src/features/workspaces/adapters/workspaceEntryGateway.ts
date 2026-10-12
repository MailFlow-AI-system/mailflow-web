import { isRemoteWorkspaceBaseHost } from '../../../config/utils/workspaceBaseHost'
import { filterBetterAuthCookies } from '../../auth/adapters/authCookies'
import { workspaceEntrySchema } from '../schemas'
import { resolveWorkspaceHost } from '../utils/workspaceHost'
import { isWorkspaceRequestOrigin } from '../utils/workspaceOrigin'
import { createWorkspaceTransport, workspaceResponseHeaders } from './workspaceTransport'

function failure(
  status: number,
  code: string,
  headers = new Headers({ 'Cache-Control': 'private, no-store' }),
) {
  return Response.json({ code }, { status, headers })
}

export function createWorkspaceEntryGateway(
  apiBaseUrl: string,
  baseHost: string | undefined,
  enabled: boolean,
  fetcher: typeof fetch = fetch,
) {
  const forward = createWorkspaceTransport(apiBaseUrl, fetcher)
  return async (request: Request) => {
    const url = new URL(request.url)
    if (request.method !== 'GET' || url.pathname !== '/api/v1/workspace-entry')
      return failure(404, 'route_not_found')
    if (
      !enabled ||
      !baseHost ||
      (baseHost !== 'workspace.test' && !isRemoteWorkspaceBaseHost(baseHost))
    )
      return failure(503, 'workspace_entry_not_configured')
    if (
      !isWorkspaceRequestOrigin(url, baseHost) ||
      resolveWorkspaceHost(url.hostname, baseHost).kind !== 'generic'
    )
      return failure(404, 'workspace_unavailable')
    if (url.search) return failure(400, 'invalid_workspace_request')
    const cookie = filterBetterAuthCookies(request.headers.get('cookie'))
    if (!cookie) return failure(401, 'authentication_required')
    try {
      const upstream = await forward(request, '/api/v1/workspace-entry')
      const headers = workspaceResponseHeaders(upstream, ['X-Request-ID'])
      if (!upstream.ok) {
        const status = [401, 429].includes(upstream.status) ? upstream.status : 502
        if (status === 429 && upstream.headers.get('retry-after'))
          headers.set('Retry-After', upstream.headers.get('retry-after') ?? '')
        return failure(
          status,
          status === 401 ? 'authentication_required' : 'workspace_entry_failed',
          headers,
        )
      }
      return Response.json(workspaceEntrySchema.parse(await upstream.json()), { headers })
    } catch {
      return failure(502, 'workspace_entry_failed')
    }
  }
}
