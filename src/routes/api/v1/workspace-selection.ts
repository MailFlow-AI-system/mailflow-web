import { createFileRoute } from '@tanstack/react-router'
import { clientEnvironment } from '#/config/env'
import { createWorkspaceSelectionGateway } from '#/features/workspaces/adapters/workspaceSelectionGateway'

const selectWorkspace = createWorkspaceSelectionGateway(
  clientEnvironment.VITE_API_BASE_URL,
  clientEnvironment.VITE_WORKSPACE_BASE_HOST,
  clientEnvironment.VITE_WORKSPACE_LOCAL_SWITCHING_ENABLED,
)
export const Route = createFileRoute('/api/v1/workspace-selection')({
  server: { handlers: { POST: ({ request }) => selectWorkspace(request) } },
})
