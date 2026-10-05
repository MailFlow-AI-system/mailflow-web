import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'
import type { RuntimeEnvironment } from './types.ts'

export const createClientEnvironment = (runtimeEnv: RuntimeEnvironment) =>
  createEnv({
    clientPrefix: 'VITE_',
    client: {
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
      VITE_WORKSPACE_BASE_HOST: runtimeEnv.VITE_WORKSPACE_BASE_HOST,
      VITE_API_BASE_URL: runtimeEnv.VITE_API_BASE_URL,
    },
    emptyStringAsUndefined: true,
  })
