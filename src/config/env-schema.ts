import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

type RuntimeEnvironment = Record<string, string | boolean | number | undefined>

export const createClientEnvironment = (runtimeEnv: RuntimeEnvironment) =>
  createEnv({
    clientPrefix: 'VITE_',
    client: {
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
      VITE_API_BASE_URL: runtimeEnv.VITE_API_BASE_URL,
    },
    emptyStringAsUndefined: true,
  })
