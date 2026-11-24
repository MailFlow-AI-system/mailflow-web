import { createFileRoute } from '@tanstack/react-router'
import { clientEnvironment } from '#/config/env'
import { createOutgoingMailProxy } from '#/features/email-composer/adapters/outgoingMailProxy'
import { readProxySecret } from '#/server/proxySecret'

const proxy = createOutgoingMailProxy(clientEnvironment.VITE_API_BASE_URL, fetch, readProxySecret)
export const Route = createFileRoute('/api/mail/attachments/$id')({
  server: { handlers: { GET: ({ request }) => proxy(request) } },
})
