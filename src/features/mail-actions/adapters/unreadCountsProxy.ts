import { filterBetterAuthCookies } from '#/features/auth/adapters/authCookies'
import {
  createWorkspaceTransport,
  workspaceResponseHeaders,
} from '#/features/workspaces/adapters/workspaceTransport'
import { resolveWorkspaceHost } from '#/features/workspaces/utils/workspaceHost'
import { isWorkspaceRequestOrigin } from '#/features/workspaces/utils/workspaceOrigin'

/** Forwards the current user's unread counts per folder for the workspace host. */
export function createUnreadCountsProxy(
  apiBaseUrl: string,
  fetcher: typeof fetch = fetch,
  baseHost?: string,
) {
  const forward = createWorkspaceTransport(apiBaseUrl, fetcher)
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url)
    const failure = (status: number, code: string) =>
      Response.json({ code }, { status, headers: { 'Cache-Control': 'private, no-store' } })
    if (request.method !== 'GET' || url.pathname !== '/api/mail/unread-counts')
      return failure(404, 'route_not_found')
    if (!baseHost) return failure(503, 'workspace_not_configured')
    const host = resolveWorkspaceHost(url.hostname, baseHost)
    if (!isWorkspaceRequestOrigin(url, baseHost) || host.kind !== 'workspace')
      return failure(404, 'workspace_unavailable')
    if (!filterBetterAuthCookies(request.headers.get('cookie')))
      return failure(401, 'authentication_required')
    try {
      const upstream = await forward(
        request,
        `/api/v1/workspaces/${host.slug}/mail/unread-counts`,
        {
          forwardIdentity: true,
        },
      )
      if (upstream.status >= 300 && upstream.status < 400)
        return failure(502, 'MAIL_COUNTS_UPSTREAM_UNAVAILABLE')
      return new Response(upstream.body, {
        status: upstream.status,
        headers: workspaceResponseHeaders(upstream, [
          'Content-Type',
          'X-Request-ID',
          'X-Workspace-Identity',
        ]),
      })
    } catch {
      return failure(502, 'MAIL_COUNTS_UPSTREAM_UNAVAILABLE')
    }
  }
}
