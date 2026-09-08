import { z } from 'zod'

const clientEnvironmentSchema = z.object({
  VITE_API_BASE_URL: z
    .string()
    .refine(
      (value) => value.startsWith('/') || URL.canParse(value),
      'Must be an absolute URL or a root-relative path',
    )
    .default('/api'),
})

export const clientEnvironment = clientEnvironmentSchema.parse(import.meta.env)
