import { createServerFn } from '@tanstack/react-start'
import { getRequest, setResponseHeader } from '@tanstack/react-start/server'
import { clientEnvironment } from '#/config/env'
import { readProxySecret } from '#/server/proxySecret'
import { readWorkspaceAccess } from './workspaceAccess'

export const getWorkspaceAccess = createServerFn({ method: 'GET' }).handler(async () => {
  setResponseHeader('Cache-Control', 'private, no-store')
  return readWorkspaceAccess(
    getRequest(),
    clientEnvironment.VITE_API_BASE_URL,
    clientEnvironment.VITE_WORKSPACE_BASE_HOST,
    clientEnvironment.workspaceSwitchingEnabled,
    fetch,
    readProxySecret,
  )
})
