import { filterBetterAuthCookies } from '#/features/auth/adapters/authCookies'
import {
  createWorkspaceTransport,
  workspaceResponseHeaders,
} from '#/features/workspaces/adapters/workspaceTransport'
import { resolveWorkspaceHost } from '#/features/workspaces/utils/workspaceHost'
import { isWorkspaceRequestOrigin } from '#/features/workspaces/utils/workspaceOrigin'

export function createMailMessagesProxyHandler(
  apiBaseUrl: string,
  fetcher: typeof fetch = fetch,
  baseHost?: string,
) {
  const forward = createWorkspaceTransport(apiBaseUrl, fetcher)
  return async function proxyMailMessages(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const failure = (status: number, code: string) =>
      Response.json({ code }, { status, headers: { 'Cache-Control': 'private, no-store' } })
    if (request.method !== 'GET' || url.pathname !== '/api/mail/messages')
      return failure(404, 'route_not_found')
    if (!baseHost) return failure(503, 'workspace_not_configured')
    const host = resolveWorkspaceHost(url.hostname, baseHost)
    if (!isWorkspaceRequestOrigin(url, baseHost) || host.kind !== 'workspace')
      return failure(404, 'workspace_unavailable')
    if (!filterBetterAuthCookies(request.headers.get('cookie')))
      return failure(401, 'authentication_required')
    const query = new URLSearchParams({ q: url.searchParams.get('q')?.trim() ?? '' })
    const cursor = url.searchParams.get('cursor')
    if (cursor !== null) query.set('cursor', cursor)
    try {
      const upstream = await forward(
        request,
        `/api/v1/workspaces/${host.slug}/mail/messages?${query}`,
        { forwardIdentity: true },
      )
      if (upstream.status >= 300 && upstream.status < 400)
        return failure(502, 'MAIL_MESSAGES_UPSTREAM_UNAVAILABLE')
      return new Response(upstream.body, {
        status: upstream.status,
        headers: workspaceResponseHeaders(upstream, [
          'Content-Type',
          'X-Request-ID',
          'X-Workspace-Identity',
        ]),
      })
    } catch {
      return Response.json(
        {
          code: 'MAIL_MESSAGES_UPSTREAM_UNAVAILABLE',
          message: 'Messages are temporarily unavailable.',
        },
        { status: 502, headers: { 'Cache-Control': 'private, no-store' } },
      )
    }
  }
}
