import { filterBetterAuthCookies } from '#/features/auth/adapters/authCookies'
import { workspaceSelectionResultSchema, workspaceSelectionSchema } from '../schemas'
import { readBoundedJson } from '../utils/readBoundedJson'
import { resolveWorkspaceHost } from '../utils/workspaceHost'
import { createWorkspaceTransport, workspaceResponseHeaders } from './workspaceTransport'

function failure(
  status: number,
  code: string,
  headers = new Headers({ 'Cache-Control': 'private, no-store' }),
) {
  return Response.json({ code }, { status, headers })
}

export function createWorkspaceSelectionGateway(
  apiBaseUrl: string,
  baseHost: string | undefined,
  enabled: boolean,
  fetcher: typeof fetch = fetch,
) {
  const forward = createWorkspaceTransport(apiBaseUrl, fetcher)
  return async (request: Request) => {
    const url = new URL(request.url)
    if (request.method !== 'POST' || url.pathname !== '/api/v1/workspace-selection')
      return failure(404, 'route_not_found')
    if (!enabled || baseHost !== 'workspace.test')
      return failure(503, 'workspace_switching_not_configured')
    if (resolveWorkspaceHost(url.hostname, baseHost).kind === 'invalid')
      return failure(404, 'workspace_unavailable')
    // Sibling subdomains are same-site, not same-origin. They cannot submit a selection here.
    if (request.headers.get('origin') !== url.origin) return failure(403, 'workspace_origin_denied')
    const cookie = filterBetterAuthCookies(request.headers.get('cookie'))
    if (!cookie) return failure(401, 'authentication_required')
    if (
      request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json'
    )
      return failure(400, 'invalid_workspace_request')
    const payload = await readBoundedJson(request)
    if (payload.kind === 'too-large') return failure(413, 'workspace_payload_too_large')
    if (payload.kind !== 'ok') return failure(400, 'invalid_workspace_request')
    const parsed = workspaceSelectionSchema.safeParse(payload.body)
    if (!parsed.success) return failure(400, 'invalid_workspace_request')
    try {
      const upstream = await forward(request, '/api/v1/workspace-selection', {
        body: JSON.stringify(parsed.data),
        forwardIdentity: true,
      })
      const responseHeaders = workspaceResponseHeaders(upstream, [
        'X-Request-ID',
        'X-Workspace-Identity',
      ])
      if (!upstream.ok) {
        const status = [400, 401, 403, 404, 413, 429].includes(upstream.status)
          ? upstream.status
          : 502
        const response = failure(
          status,
          status === 404 ? 'workspace_unavailable' : 'workspace_selection_failed',
          responseHeaders,
        )
        if (status === 429 && upstream.headers.get('retry-after'))
          response.headers.set('Retry-After', upstream.headers.get('retry-after') ?? '')
        return response
      }
      const result = workspaceSelectionResultSchema.parse(await upstream.json())
      if (result.workspace.id !== parsed.data.workspaceId)
        return failure(502, 'workspace_selection_failed', responseHeaders)
      return Response.json(result, { headers: responseHeaders })
    } catch {
      return failure(502, 'workspace_selection_failed')
    }
  }
}
