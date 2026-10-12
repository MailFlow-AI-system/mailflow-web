import { filterBetterAuthCookies } from '../../auth/adapters/authCookies'
import { resolveWorkspaceHost } from '../utils/workspaceHost'
import { isWorkspaceRequestOrigin } from '../utils/workspaceOrigin'
import { createWorkspaceTransport, workspaceResponseHeaders } from './workspaceTransport'

function failure(status: number, code: string) {
  return Response.json({ code }, { status, headers: { 'Cache-Control': 'private, no-store' } })
}

export function createWorkspaceGateway(
  apiBaseUrl: string,
  baseHost: string | undefined,
  fetcher: typeof fetch = fetch,
) {
  const forward = createWorkspaceTransport(apiBaseUrl, fetcher)
  return async (request: Request) => {
    if (request.method !== 'GET') return failure(405, 'method_not_allowed')
    if (!baseHost) return failure(503, 'workspace_not_configured')
    const url = new URL(request.url)
    const host = resolveWorkspaceHost(url.hostname, baseHost)
    if (!isWorkspaceRequestOrigin(url, baseHost) || host.kind === 'invalid')
      return failure(404, 'workspace_unavailable')
    const cookie = filterBetterAuthCookies(request.headers.get('cookie'))
    if (!cookie) return failure(401, 'authentication_required')
    let path: string
    if (url.pathname === '/api/workspace-context') {
      if (host.kind === 'generic') {
        // A generic host has no tenant authority. Still verify the identity before returning context.
        path = '/api/auth/get-session'
      } else path = `/api/v1/workspaces/${host.slug}/context`
    } else if (url.pathname === '/api/v1/workspaces') {
      const cursor = url.searchParams.get('cursor')
      if (cursor !== null && (!cursor || cursor.length > 128))
        return failure(400, 'invalid_workspace_request')
      path = `/api/v1/workspaces${cursor === null ? '' : `?${new URLSearchParams({ cursor })}`}`
    } else return failure(404, 'route_not_found')
    try {
      const upstream = await forward(request, path, { forwardIdentity: true })
      if (url.pathname === '/api/workspace-context' && host.kind === 'generic' && upstream.ok) {
        const session: unknown = await upstream.json()
        if (!session || typeof session !== 'object' || !('user' in session))
          return failure(401, 'authentication_required')
        const user = session.user
        if (!user || typeof user !== 'object' || !('id' in user) || typeof user.id !== 'string')
          return failure(502, 'workspace_upstream_unavailable')
        return Response.json(
          { workspace: null },
          { headers: { 'Cache-Control': 'private, no-store', 'X-Workspace-Identity': user.id } },
        )
      }
      const headers = workspaceResponseHeaders(upstream, [
        'Content-Type',
        'Retry-After',
        'X-Workspace-Identity',
        'X-Request-ID',
      ])
      if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
      if (upstream.status >= 300 && upstream.status < 400)
        return failure(502, 'workspace_upstream_unavailable')
      return new Response(upstream.body, { status: upstream.status, headers })
    } catch {
      return failure(502, 'workspace_upstream_unavailable')
    }
  }
}
