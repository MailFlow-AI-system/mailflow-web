import { z } from 'zod'

export const workspaceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slug: z
    .string()
    .max(63)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  role: z.enum(['owner', 'admin', 'member']),
})
export const workspacePageSchema = z.object({
  items: z.array(workspaceSchema).max(50),
  nextCursor: z.string().nullable(),
})
export const workspaceContextSchema = z.object({ workspace: workspaceSchema.nullable() })
