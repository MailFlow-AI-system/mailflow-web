import { createMiddleware, createStart } from '@tanstack/react-start'
import { clientEnvironment } from '#/config/env'
import { landingRedirect } from '#/features/workspaces/utils/landingRedirect'

// Runs before SSR, server routes and server functions on every host this Worker serves.
const workspaceHostOnly = createMiddleware().server(async ({ next, request }) => {
  const { workspaceSwitchingEnabled, VITE_WORKSPACE_BASE_HOST, VITE_SITE_URL } = clientEnvironment
  if (workspaceSwitchingEnabled && VITE_WORKSPACE_BASE_HOST && VITE_SITE_URL) {
    const location = landingRedirect(new URL(request.url), VITE_WORKSPACE_BASE_HOST, VITE_SITE_URL)
    if (location)
      return new Response(null, {
        status: 302,
        headers: { Location: location, 'Cache-Control': 'private, no-store' },
      })
  }
  return next()
})

export const startInstance = createStart(() => ({
  requestMiddleware: [workspaceHostOnly],
}))
