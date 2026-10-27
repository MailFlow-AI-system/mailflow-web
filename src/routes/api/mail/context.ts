import { createFileRoute } from '@tanstack/react-router'
import { clientEnvironment } from '#/config/env'
import { createOutgoingMailProxy } from '#/features/email-composer/adapters/outgoingMailProxy'

const proxy = createOutgoingMailProxy(clientEnvironment.VITE_API_BASE_URL)
export const Route = createFileRoute('/api/mail/context')({
  server: { handlers: { GET: ({ request }) => proxy(request) } },
})
