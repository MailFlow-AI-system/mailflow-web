import { filterBetterAuthCookies } from '#/features/auth/adapters/authCookies'

const allowedRequestHeaders = new Set(['accept', 'traceparent', 'tracestate'])

export function createMailMessagesProxyHandler(apiBaseUrl: string, fetcher: typeof fetch = fetch) {
  return async function proxyMailMessages(request: Request): Promise<Response> {
    const incomingUrl = new URL(request.url)
    if (request.method !== 'GET' || incomingUrl.pathname !== '/api/mail/messages') {
      return new Response(null, {
        status: 404,
        headers: { 'Cache-Control': 'private, no-store' },
      })
    }

    const upstreamUrl = new URL('/api/v1/mail/messages', apiBaseUrl)
    upstreamUrl.searchParams.set('q', incomingUrl.searchParams.get('q')?.trim() ?? '')
    const cursor = incomingUrl.searchParams.get('cursor')
    if (cursor) upstreamUrl.searchParams.set('cursor', cursor)

    const headers = new Headers()
    request.headers.forEach((value, name) => {
      if (allowedRequestHeaders.has(name)) headers.set(name, value)
    })
    const authCookies = filterBetterAuthCookies(request.headers.get('cookie'))
    if (authCookies) headers.set('cookie', authCookies)

    try {
      const upstream = await fetcher(upstreamUrl, {
        method: 'GET',
        headers,
        redirect: 'manual',
        cache: 'no-store',
        signal: request.signal,
      })
      const responseHeaders = new Headers()
      const contentType = upstream.headers.get('content-type')
      if (contentType) responseHeaders.set('content-type', contentType)
      const requestId = upstream.headers.get('x-request-id')
      if (requestId) responseHeaders.set('x-request-id', requestId)
      responseHeaders.set('Cache-Control', 'private, no-store')

      return new Response(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: responseHeaders,
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
