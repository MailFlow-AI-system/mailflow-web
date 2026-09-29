import { createFileRoute } from '@tanstack/react-router'

import { clientEnvironment } from '#/config/env'
import { createAuthProxyHandler } from '#/features/auth/adapters/authProxy'

const proxyAuthRequest = createAuthProxyHandler(clientEnvironment.VITE_API_BASE_URL)

export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: ({ request }) => proxyAuthRequest(request),
      POST: ({ request }) => proxyAuthRequest(request),
    },
  },
})
