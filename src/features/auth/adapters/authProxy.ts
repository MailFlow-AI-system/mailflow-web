import { AUTH_UPSTREAM_UNAVAILABLE } from '../authErrorCodes'
import { filterBetterAuthCookies } from './authCookies'

const allowedAuthRequests = new Set([
  'GET /api/auth/get-session',
  'POST /api/auth/request-password-reset',
  'POST /api/auth/reset-password',
  'POST /api/auth/sign-in/email',
  'POST /api/auth/sign-out',
])

const forwardedRequestHeaders = new Set([
  'accept',
  'content-type',
  'origin',
  'sec-fetch-dest',
  'sec-fetch-mode',
  'sec-fetch-site',
  'traceparent',
  'tracestate',
])

const hopByHopHeaders = new Set([
  'connection',
  'content-length',
  'host',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
])

type StreamingRequestInit = RequestInit & { duplex?: 'half' }

function copyRequestHeaders(source: Headers): Headers {
  const connectionTokens = source.get('connection')?.split(',') ?? []
  const headers = new Headers()

  source.forEach((value, name) => {
    if (forwardedRequestHeaders.has(name)) headers.set(name, value)
  })

  const referer = source.get('referer')
  if (referer) {
    try {
      const url = new URL(referer)
      if (
        (url.protocol === 'http:' || url.protocol === 'https:') &&
        !url.username &&
        !url.password
      ) {
        headers.set('referer', url.origin)
      }
    } catch {
      // Better Auth falls back to Referer only when Origin is absent.
    }
  }

  const authCookies = filterBetterAuthCookies(source.get('cookie'))
  if (authCookies) headers.set('cookie', authCookies)

  for (const name of hopByHopHeaders) headers.delete(name)
  for (const token of connectionTokens) {
    const name = token.trim()
    if (name) headers.delete(name)
  }

  return headers
}

function copyResponseHeaders(source: Headers): Headers {
  const headers = new Headers()
  const setCookies = source.getSetCookie()
  const connectionTokens = source.get('connection')?.split(',') ?? []

  source.forEach((value, name) => {
    if (name === 'set-cookie' || hopByHopHeaders.has(name)) return
    if (connectionTokens.some((token) => token.trim().toLowerCase() === name)) return
    headers.append(name, value)
  })

  for (const cookie of setCookies) headers.append('set-cookie', cookie)
  headers.set('cache-control', 'private, no-store')

  return headers
}

export function createAuthProxyHandler(apiBaseUrl: string, fetcher: typeof fetch = fetch) {
  return async function proxyAuthRequest(request: Request): Promise<Response> {
    const incomingUrl = new URL(request.url)
    if (!allowedAuthRequests.has(`${request.method} ${incomingUrl.pathname}`)) {
      return new Response(null, {
        status: 404,
        headers: { 'Cache-Control': 'private, no-store' },
      })
    }

    const upstreamUrl = new URL(incomingUrl.pathname + incomingUrl.search, apiBaseUrl)
    const init: StreamingRequestInit = {
      method: request.method,
      headers: copyRequestHeaders(request.headers),
      redirect: 'manual',
      cache: 'no-store',
    }

    if (request.body) {
      init.body = request.body
      init.duplex = 'half'
    }

    try {
      const upstream = await fetcher(upstreamUrl, init)
      return new Response(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: copyResponseHeaders(upstream.headers),
      })
    } catch {
      return Response.json(
        {
          code: AUTH_UPSTREAM_UNAVAILABLE,
          message: 'Authentication is temporarily unavailable.',
        },
        { status: 502, headers: { 'Cache-Control': 'private, no-store' } },
      )
    }
  }
}
