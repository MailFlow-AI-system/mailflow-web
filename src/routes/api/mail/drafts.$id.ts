import { createFileRoute } from '@tanstack/react-router'
import { clientEnvironment } from '#/config/env'
import { createOutgoingMailProxy } from '#/features/email-composer/adapters/outgoingMailProxy'

const proxy = createOutgoingMailProxy(clientEnvironment.VITE_API_BASE_URL, fetch)
export const Route = createFileRoute('/api/mail/drafts/$id')({
  server: {
    handlers: {
      GET: ({ request }) => proxy(request),
      PUT: ({ request }) => proxy(request),
      DELETE: ({ request }) => proxy(request),
    },
  },
})
