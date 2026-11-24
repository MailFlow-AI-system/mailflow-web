import { createFileRoute } from '@tanstack/react-router'
import { clientEnvironment } from '#/config/env'
import { createMailDetailProxy } from '#/features/mail-reader/mailDetailProxy'
import { readProxySecret } from '#/server/proxySecret'

const proxy = createMailDetailProxy(
  clientEnvironment.VITE_API_BASE_URL,
  fetch,
  clientEnvironment.VITE_WORKSPACE_BASE_HOST,
  readProxySecret,
)
export const Route = createFileRoute('/api/mail/messages/$id')({
  server: { handlers: { GET: ({ request }) => proxy(request) } },
})
