import { filterBetterAuthCookies } from '../../auth/adapters/authCookies'
import { workspaceEntrySchema } from '../schemas'
import { resolveWorkspaceHost } from '../utils/workspaceHost'

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
  return async (request: Request) => {
    const url = new URL(request.url)
    if (request.method !== 'GET' || url.pathname !== '/api/v1/workspace-entry')
      return failure(404, 'route_not_found')
    if (!enabled || baseHost !== 'workspace.test')
      return failure(503, 'workspace_entry_not_configured')
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      resolveWorkspaceHost(url.hostname, baseHost).kind !== 'generic'
    )
      return failure(404, 'workspace_unavailable')
    if (url.search) return failure(400, 'invalid_workspace_request')
    const cookie = filterBetterAuthCookies(request.headers.get('cookie'))
    if (!cookie) return failure(401, 'authentication_required')
    try {
      const upstream = await fetcher(new URL('/api/v1/workspace-entry', apiBaseUrl), {
        headers: {
          Cookie: cookie,
          Accept: 'application/json',
          ...(request.headers.get('traceparent')
            ? { traceparent: request.headers.get('traceparent') ?? '' }
            : {}),
          ...(request.headers.get('tracestate')
            ? { tracestate: request.headers.get('tracestate') ?? '' }
            : {}),
        },
        cache: 'no-store',
        redirect: 'manual',
        signal: AbortSignal.any([request.signal, AbortSignal.timeout(5000)]),
      })
      const headers = new Headers({ 'Cache-Control': 'private, no-store' })
      const requestId = upstream.headers.get('x-request-id')
      if (requestId) headers.set('X-Request-ID', requestId)
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
