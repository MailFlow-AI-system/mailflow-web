import { createFileRoute } from '@tanstack/react-router'
import { clientEnvironment } from '#/config/env'
import { createUnreadCountsProxy } from '#/features/mail-actions/adapters/unreadCountsProxy'

const proxy = createUnreadCountsProxy(
  clientEnvironment.VITE_API_BASE_URL,
  fetch,
  clientEnvironment.VITE_WORKSPACE_BASE_HOST,
)

export const Route = createFileRoute('/api/mail/unread-counts')({
  server: { handlers: { GET: ({ request }) => proxy(request) } },
})
