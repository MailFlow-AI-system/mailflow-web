import { z } from 'zod'
import {
  readWorkspaceResponse,
  WorkspaceIdentityChangedError,
} from '#/features/workspaces/clients/workspaceAuthority'
import { workspaceSchema } from '#/features/workspaces/schemas'

const sentEmailSchema = z.object({
  id: z.string(),
  to: z.array(z.string()),
  cc: z.array(z.string()),
  bcc: z.array(z.string()),
  recipientName: z.string().trim().default(''),
  subject: z.string(),
  text: z.string(),
  sentAt: z.string().nullable(),
})
const pageSchema = z.object({ items: z.array(sentEmailSchema), nextOffset: z.number().nullable() })
const contextSchema = z.object({
  userId: z.string().min(1),
  workspace: workspaceSchema.extend({
    id: z
      .string()
      .min(1)
      .max(128)
      .regex(/^[\x21-\x2b\x2d-\x7e]+$/),
  }),
})

export async function readSentWorkspace(userId: string, signal: AbortSignal) {
  const context = contextSchema.parse(
    await readWorkspaceResponse('/api/mail/context', userId, signal),
  )
  if (context.userId !== userId) throw new WorkspaceIdentityChangedError()
  return context.workspace
}

export async function fetchSentEmails(
  userId: string,
  workspaceId: string,
  offset: number,
  signal: AbortSignal,
) {
  return pageSchema.parse(
    await readWorkspaceResponse(
      `/api/mail/sent?offset=${offset}`,
      userId,
      signal,
      {
        method: 'GET',
        headers: { Accept: 'application/json', 'X-Workspace-Id': workspaceId },
      },
      workspaceId,
    ),
  )
}
