import { createFileRoute } from '@tanstack/react-router'
import { clientEnvironment } from '#/config/env'
import { createMailDetailProxy } from '#/features/mail-reader/mailDetailProxy'

const proxy = createMailDetailProxy(
  clientEnvironment.VITE_API_BASE_URL,
  fetch,
  clientEnvironment.VITE_WORKSPACE_BASE_HOST,
)
export const Route = createFileRoute('/api/mail/messages/$id')({
  server: { handlers: { GET: ({ request }) => proxy(request) } },
})
