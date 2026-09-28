import { z } from 'zod'

export const authSessionSchema = z.object({
  session: z.object({ id: z.string() }),
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
  }),
})
