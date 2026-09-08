import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

type RuntimeEnvironment = Record<string, string | boolean | number | undefined>

export const createClientEnvironment = (runtimeEnv: RuntimeEnvironment) =>
  createEnv({
    clientPrefix: 'VITE_',
    client: {
      VITE_API_BASE_URL: z
        .string()
        .refine(
          (value) => value.startsWith('/') || URL.canParse(value),
          'Must be an absolute URL or a root-relative path',
        )
        .default('/api'),
    },
    runtimeEnvStrict: {
      VITE_API_BASE_URL: runtimeEnv.VITE_API_BASE_URL,
    },
    emptyStringAsUndefined: true,
  })
