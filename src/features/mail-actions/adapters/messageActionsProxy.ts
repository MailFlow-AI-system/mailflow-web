import { filterBetterAuthCookies } from '#/features/auth/adapters/authCookies'
import {
  createWorkspaceTransport,
  workspaceResponseHeaders,
} from '#/features/workspaces/adapters/workspaceTransport'
import { resolveWorkspaceHost } from '#/features/workspaces/utils/workspaceHost'
import { isWorkspaceRequestOrigin } from '#/features/workspaces/utils/workspaceOrigin'

const MAX_BODY_BYTES = 16_384

/** Forwards message actions from the workspace host to Core, accepting only same-origin JSON. */
export function createMessageActionsProxy(
  apiBaseUrl: string,
  fetcher: typeof fetch = fetch,
  baseHost?: string,
) {
  const forward = createWorkspaceTransport(apiBaseUrl, fetcher)
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url)
    const failure = (status: number, code: string) =>
      Response.json({ code }, { status, headers: { 'Cache-Control': 'private, no-store' } })
    if (request.method !== 'POST' || url.pathname !== '/api/mail/messages/actions')
      return failure(404, 'route_not_found')
    if (!baseHost) return failure(503, 'workspace_not_configured')
    const host = resolveWorkspaceHost(url.hostname, baseHost)
    if (!isWorkspaceRequestOrigin(url, baseHost) || host.kind !== 'workspace')
      return failure(404, 'workspace_unavailable')
    if (
      request.headers.get('origin') !== url.origin ||
      request.headers.get('sec-fetch-site') === 'cross-site'
    )
      return failure(403, 'origin_not_allowed')
    if (request.headers.get('content-type')?.split(';')[0]?.trim() !== 'application/json')
      return failure(415, 'unsupported_media_type')
    if (!filterBetterAuthCookies(request.headers.get('cookie')))
      return failure(401, 'authentication_required')
    const body = await request.text()
    if (body.length > MAX_BODY_BYTES) return failure(413, 'payload_too_large')
    try {
      const upstream = await forward(
        request,
        `/api/v1/workspaces/${host.slug}/mail/messages/actions`,
        { forwardIdentity: true, body },
      )
      if (upstream.status >= 300 && upstream.status < 400)
        return failure(502, 'MAIL_ACTIONS_UPSTREAM_UNAVAILABLE')
      return new Response(upstream.body, {
        status: upstream.status,
        headers: workspaceResponseHeaders(upstream, [
          'Content-Type',
          'X-Request-ID',
          'X-Workspace-Identity',
        ]),
      })
    } catch {
      return failure(502, 'MAIL_ACTIONS_UPSTREAM_UNAVAILABLE')
    }
  }
}
