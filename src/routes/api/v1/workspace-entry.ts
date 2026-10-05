import { createFileRoute } from '@tanstack/react-router'
import { clientEnvironment } from '#/config/env'
import { createWorkspaceEntryGateway } from '#/features/workspaces/adapters/workspaceEntryGateway'

const gateway = createWorkspaceEntryGateway(
  clientEnvironment.VITE_API_BASE_URL,
  clientEnvironment.VITE_WORKSPACE_BASE_HOST,
  clientEnvironment.VITE_WORKSPACE_LOCAL_SWITCHING_ENABLED,
)
export const Route = createFileRoute('/api/v1/workspace-entry')({
  server: { handlers: { GET: ({ request }) => gateway(request) } },
})
