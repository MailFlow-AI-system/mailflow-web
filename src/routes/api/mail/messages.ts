import { createFileRoute } from '@tanstack/react-router'

import { clientEnvironment } from '#/config/env'
import { createMailMessagesProxyHandler } from '#/features/mail-list/adapters/mailMessagesProxy'

const proxyMailMessages = createMailMessagesProxyHandler(clientEnvironment.VITE_API_BASE_URL)

export const Route = createFileRoute('/api/mail/messages')({
  server: {
    handlers: {
      GET: ({ request }) => proxyMailMessages(request),
    },
  },
})
