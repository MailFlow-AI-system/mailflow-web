import {
  clientIpHeaders,
  noProxySecret,
  type ProxySecretReader,
} from '#/features/auth/adapters/clientIpForwarding'
import { resolveWorkspaceHost } from '../utils/workspaceHost'
import { isWorkspaceRequestOrigin } from '../utils/workspaceOrigin'

export const HANDOFF_FAILURE_LOCATION = '/login?handoff=expired'
const handoffCode = /^[A-Za-z0-9_-]{43}$/

function redirect(location: string, setCookies: string[] = []) {
  const headers = new Headers({
    Location: location,
    'Cache-Control': 'private, no-store',
    // The code is in this page's URL; never leak it through the next navigation.
    'Referrer-Policy': 'no-referrer',
  })
  for (const cookie of setCookies) headers.append('Set-Cookie', cookie)
  return new Response(null, { status: 303, headers })
}

// Exchanges a one-time workspace handoff code for a host-only session on this workspace host.
// The browser never calls Core directly: this Worker posts the code with its own origin, which
// Core binds to the code's destination workspace, and relays the new session cookie.
export function createWorkspaceHandoffHandler(
  apiBaseUrl: string,
  baseHost: string | undefined,
  enabled: boolean,
  fetcher: typeof fetch = fetch,
  readProxySecret: ProxySecretReader = noProxySecret,
) {
  return async (request: Request) => {
    const url = new URL(request.url)
    if (
      !enabled ||
      !baseHost ||
      !isWorkspaceRequestOrigin(url, baseHost) ||
      resolveWorkspaceHost(url.hostname, baseHost).kind !== 'workspace'
    )
      return new Response(null, { status: 404, headers: { 'Cache-Control': 'private, no-store' } })
    const codes = url.searchParams.getAll('code')
    const code = codes.length === 1 ? codes[0] : ''
    if (!handoffCode.test(code)) return redirect(HANDOFF_FAILURE_LOCATION)
    try {
      const upstream = await fetcher(new URL('/api/auth/workspace-handoff/exchange', apiBaseUrl), {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Origin: url.origin,
          ...clientIpHeaders(request, readProxySecret()),
        },
        body: JSON.stringify({ code }),
        cache: 'no-store',
        redirect: 'manual',
        signal: AbortSignal.any([request.signal, AbortSignal.timeout(5000)]),
      })
      if (!upstream.ok) return redirect(HANDOFF_FAILURE_LOCATION)
      return redirect('/inbox', upstream.headers.getSetCookie())
    } catch {
      return redirect(HANDOFF_FAILURE_LOCATION)
    }
  }
}
