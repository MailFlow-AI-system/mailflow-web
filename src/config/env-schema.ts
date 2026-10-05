import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'
import type { RuntimeEnvironment } from './types.ts'

export const createClientEnvironment = (runtimeEnv: RuntimeEnvironment) => {
  const environment = createEnv({
    clientPrefix: 'VITE_',
    client: {
      VITE_WORKSPACE_LOCAL_SWITCHING_ENABLED: z
        .enum(['true', 'false'])
        .default('false')
        .transform((value) => value === 'true'),
      VITE_WORKSPACE_BASE_HOST: z
        .string()
        .max(253)
        .regex(/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/)
        .optional(),
      VITE_API_BASE_URL: z.string().refine((value) => {
        if (!URL.canParse(value)) return false
        const url = new URL(value)
        return (
          ['http:', 'https:'].includes(url.protocol) &&
          url.pathname === '/' &&
          !url.search &&
          !url.hash &&
          !url.username &&
          !url.password
        )
      }, 'Must be an API origin without a path or credentials'),
    },
    runtimeEnvStrict: {
      VITE_WORKSPACE_LOCAL_SWITCHING_ENABLED: runtimeEnv.VITE_WORKSPACE_LOCAL_SWITCHING_ENABLED,
      VITE_WORKSPACE_BASE_HOST: runtimeEnv.VITE_WORKSPACE_BASE_HOST,
      VITE_API_BASE_URL: runtimeEnv.VITE_API_BASE_URL,
    },
    emptyStringAsUndefined: true,
  })
  if (
    environment.VITE_WORKSPACE_LOCAL_SWITCHING_ENABLED &&
    environment.VITE_WORKSPACE_BASE_HOST !== 'workspace.test'
  )
    throw new Error('Local workspace switching requires the isolated workspace.test zone')
  return environment
}
