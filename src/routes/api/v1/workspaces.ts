import { createFileRoute } from '@tanstack/react-router'
import { clientEnvironment } from '#/config/env'
import { createWorkspaceGateway } from '#/features/workspaces/adapters/workspaceGateway'

const gateway = createWorkspaceGateway(
  clientEnvironment.VITE_API_BASE_URL,
  clientEnvironment.VITE_WORKSPACE_BASE_HOST,
)
export const Route = createFileRoute('/api/v1/workspaces')({
  server: { handlers: { GET: ({ request }) => gateway(request) } },
})
