import { filterBetterAuthCookies } from '#/features/auth/adapters/authCookies'
import {
  createWorkspaceTransport,
  workspaceResponseHeaders,
} from '#/features/workspaces/adapters/workspaceTransport'
import { resolveWorkspaceHost } from '#/features/workspaces/utils/workspaceHost'
import { isWorkspaceRequestOrigin } from '#/features/workspaces/utils/workspaceOrigin'

export function createMailDetailProxy(
  apiBaseUrl: string,
  fetcher: typeof fetch = fetch,
  baseHost?: string,
) {
  const forward = createWorkspaceTransport(apiBaseUrl, fetcher)
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url)
    const failure = (status: number) =>
      Response.json(
        { code: 'message_unavailable' },
        { status, headers: { 'Cache-Control': 'private, no-store' } },
      )
    const match = /^\/api\/mail\/messages\/([a-zA-Z0-9_-]{1,128})$/.exec(url.pathname)
    if (request.method !== 'GET' || !match) return failure(404)
    if (!baseHost) return failure(503)
    const host = resolveWorkspaceHost(url.hostname, baseHost)
    if (host.kind !== 'workspace' || !isWorkspaceRequestOrigin(url, baseHost)) return failure(404)
    if (!filterBetterAuthCookies(request.headers.get('cookie'))) return failure(401)
    try {
      const response = await forward(
        request,
        `/api/v1/workspaces/${host.slug}/mail/messages/${match[1]}`,
        { forwardIdentity: true },
      )
      if (response.status >= 300 && response.status < 400) return failure(502)
      const headers = workspaceResponseHeaders(response, [
        'Content-Type',
        'X-Request-ID',
        'X-Workspace-Identity',
      ])
      const workspaceId = response.headers.get('X-Workspace-Id')
      if (workspaceId) headers.set('X-Workspace-Id', workspaceId)
      return new Response(response.body, { status: response.status, headers })
    } catch {
      return failure(502)
    }
  }
}
