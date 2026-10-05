import { createServerFn } from '@tanstack/react-start'
import { getRequest, setResponseHeader } from '@tanstack/react-start/server'
import { z } from 'zod'
import { clientEnvironment } from '#/config/env'
import { readWorkspaceEntryBootstrap } from './workspaceEntryBootstrap'

export const getWorkspaceEntryBootstrap = createServerFn({ method: 'GET' })
  .validator(z.object({ pathname: z.string().max(2048) }).strict())
  .handler(async ({ data }) => {
    setResponseHeader('Cache-Control', 'private, no-store')
    return readWorkspaceEntryBootstrap(
      getRequest(),
      data.pathname,
      clientEnvironment.VITE_API_BASE_URL,
      clientEnvironment.VITE_WORKSPACE_BASE_HOST,
      clientEnvironment.VITE_WORKSPACE_LOCAL_SWITCHING_ENABLED,
    )
  })
