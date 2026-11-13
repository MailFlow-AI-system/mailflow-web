import { createFileRoute } from '@tanstack/react-router'
import { clientEnvironment } from '#/config/env'
import { createMessageActionsProxy } from '#/features/mail-actions/adapters/messageActionsProxy'

const proxy = createMessageActionsProxy(
  clientEnvironment.VITE_API_BASE_URL,
  fetch,
  clientEnvironment.VITE_WORKSPACE_BASE_HOST,
)

export const Route = createFileRoute('/api/mail/messages/actions')({
  server: { handlers: { POST: ({ request }) => proxy(request) } },
})
