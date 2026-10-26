import { filterBetterAuthCookies } from '#/features/auth/adapters/authCookies'

export function createOutgoingMailProxy(
  apiBaseUrl: string,
  fetcher: typeof fetch = fetch,
  workspaceMode = false,
) {
  return async (request: Request): Promise<Response> => {
    const incoming = new URL(request.url)
    const sending = request.method === 'POST' && incoming.pathname === '/api/mail/send'
    const listing = request.method === 'GET' && incoming.pathname === '/api/mail/sent'
    const attachmentPath =
      /^\/api\/mail\/attachments\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(?:\/(complete|download))?$/.exec(
        incoming.pathname,
      )
    const creatingAttachment =
      request.method === 'POST' && incoming.pathname === '/api/mail/attachments'
    const completingAttachment = request.method === 'POST' && attachmentPath?.[1] === 'complete'
    const readingAttachment =
      request.method === 'GET' && Boolean(attachmentPath) && attachmentPath?.[1] !== 'complete'
    const mutating = sending || creatingAttachment || completingAttachment
    const attachmentRoute = creatingAttachment || completingAttachment || readingAttachment
    const privateHeaders = { 'Cache-Control': 'private, no-store' }
    if (!sending && !listing && !attachmentRoute)
      return new Response(null, { status: 404, headers: privateHeaders })
    if (workspaceMode)
      return Response.json(
        { code: 'workspace_mail_unavailable' },
        { status: 503, headers: privateHeaders },
      )
    if (
      mutating &&
      (request.headers.get('origin') !== incoming.origin ||
        request.headers.get('sec-fetch-site') === 'cross-site')
    )
      return new Response(null, { status: 403, headers: privateHeaders })
    if (
      mutating &&
      request.headers.get('content-type')?.split(';')[0]?.trim() !== 'application/json'
    )
      return new Response(null, { status: 415, headers: privateHeaders })
    const upstreamUrl = new URL(
      attachmentRoute
        ? incoming.pathname.replace('/api/mail/', '/api/v1/mail/')
        : sending
          ? '/api/v1/mail/send'
          : '/api/v1/mail/sent',
      apiBaseUrl,
    )
    if (listing && incoming.searchParams.has('offset'))
      upstreamUrl.searchParams.set('offset', incoming.searchParams.get('offset') ?? '')
    const headers = new Headers()
    for (const name of ['accept', 'content-type', 'origin', 'traceparent', 'tracestate']) {
      const value = request.headers.get(name)
      if (value) headers.set(name, value)
    }
    const cookies = filterBetterAuthCookies(request.headers.get('cookie'))
    if (cookies) headers.set('cookie', cookies)
    try {
      const init: RequestInit & { duplex?: 'half' } = {
        method: request.method,
        headers,
        redirect: 'manual',
        cache: 'no-store',
        signal: request.signal,
      }
      if (mutating) {
        init.body = request.body
        init.duplex = 'half'
      }
      const response = await fetcher(upstreamUrl, init)
      const responseHeaders = new Headers(privateHeaders)
      for (const name of [
        'content-type',
        'x-request-id',
        'location',
        'content-disposition',
        'x-content-type-options',
      ]) {
        const value = response.headers.get(name)
        if (value) responseHeaders.set(name, value)
      }
      return new Response(response.body, { status: response.status, headers: responseHeaders })
    } catch {
      return Response.json(
        { code: 'mail_upstream_unavailable' },
        { status: 502, headers: privateHeaders },
      )
    }
  }
}
