import { z } from 'zod'

export const workspaceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slug: z
    .string()
    .max(63)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  role: z.enum([
    'owner',
    'admin',
    'member',
    'manager',
    'marketing_specialist',
    'analyst',
    'viewer',
    'custom',
  ]),
  // Only the context responses carry capabilities; absent means none (default deny).
  capabilities: z.array(z.string()).optional(),
})
export const workspacePageSchema = z.object({
  items: z.array(workspaceSchema).max(50),
  nextCursor: z.string().nullable(),
})
export const workspaceContextSchema = z.object({ workspace: workspaceSchema.nullable() })
export const workspaceHandoffResultSchema = z.object({ url: z.string().max(2048) }).strict()
