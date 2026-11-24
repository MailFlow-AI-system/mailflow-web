import { createFileRoute } from '@tanstack/react-router'
import { clientEnvironment } from '#/config/env'
import { createWorkspaceHandoffHandler } from '#/features/workspaces/adapters/workspaceHandoff'

const exchangeHandoff = createWorkspaceHandoffHandler(
  clientEnvironment.VITE_API_BASE_URL,
  clientEnvironment.VITE_WORKSPACE_BASE_HOST,
  clientEnvironment.workspaceSwitchingEnabled,
)
export const Route = createFileRoute('/auth/handoff')({
  server: { handlers: { GET: ({ request }) => exchangeHandoff(request) } },
})
