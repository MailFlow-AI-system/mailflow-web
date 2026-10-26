import { createFileRoute } from '@tanstack/react-router'
import { clientEnvironment } from '#/config/env'
import { createOutgoingMailProxy } from '#/features/email-composer/adapters/outgoingMailProxy'

const proxy = createOutgoingMailProxy(
  clientEnvironment.VITE_API_BASE_URL,
  fetch,
  Boolean(clientEnvironment.VITE_WORKSPACE_BASE_HOST),
)
export const Route = createFileRoute('/api/mail/attachments')({
  server: { handlers: { POST: ({ request }) => proxy(request) } },
})
