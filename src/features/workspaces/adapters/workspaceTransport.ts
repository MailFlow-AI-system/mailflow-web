import { filterBetterAuthCookies } from '../../auth/adapters/authCookies'
import type { WorkspaceResponseHeader, WorkspaceTransportOptions } from '../types/transport'

export function createWorkspaceTransport(apiBaseUrl: string, fetcher: typeof fetch) {
  return (request: Request, path: string, options: WorkspaceTransportOptions = {}) => {
    const cookie = filterBetterAuthCookies(request.headers.get('cookie'))
    if (!cookie) throw new Error('Workspace forwarding requires a session cookie')
    const headers: Record<string, string> = {
      Cookie: cookie,
      Accept: 'application/json',
    }
    for (const name of ['traceparent', 'tracestate']) {
      const value = request.headers.get(name)
      if (value) headers[name] = value
    }
    if (options.forwardIdentity) {
      const identity = request.headers.get('x-workspace-identity')
      if (identity) headers['X-Workspace-Identity'] = identity
    }
    if (options.body !== undefined) {
      headers.Origin = new URL(request.url).origin
      headers['Content-Type'] = 'application/json'
    }
    return fetcher(new URL(path, apiBaseUrl), {
      headers,
      ...(options.body !== undefined ? { method: 'POST', body: options.body } : {}),
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(5000)]),
    })
  }
}

export function workspaceResponseHeaders(
  upstream: Response,
  allowed: readonly WorkspaceResponseHeader[],
) {
  const headers = new Headers({ 'Cache-Control': 'private, no-store' })
  for (const name of allowed) {
    const value = upstream.headers.get(name)
    if (value) headers.set(name, value)
  }
  return headers
}
