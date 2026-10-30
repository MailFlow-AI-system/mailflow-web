import { createFileRoute } from '@tanstack/react-router'
import { clientEnvironment } from '#/config/env'
import { createOutgoingMailProxy } from '#/features/email-composer/adapters/outgoingMailProxy'

const proxy = createOutgoingMailProxy(clientEnvironment.VITE_API_BASE_URL, fetch)
export const Route = createFileRoute('/api/mail/sent/$id')({
  server: { handlers: { GET: ({ request }) => proxy(request) } },
})
