import { createAuthClient } from 'better-auth/react'

import { clientEnvironment } from '#/config/env'

export const authClient = createAuthClient({
  baseURL: clientEnvironment.VITE_API_BASE_URL,
  fetchOptions: { credentials: 'include' },
})
