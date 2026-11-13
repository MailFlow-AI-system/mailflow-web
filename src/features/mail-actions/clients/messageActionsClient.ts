import { z } from 'zod'
import { readWorkspaceResponse } from '#/features/workspaces/clients/workspaceAuthority'
import type { MessageAction } from '../messageActions'

const resultsSchema = z.object({
  results: z.array(z.object({ id: z.string(), status: z.string() })),
})

export type MessageActionResult = z.infer<typeof resultsSchema>['results'][number]

/** Applies one action to up to 100 messages; Core answers per message. */
export async function postMessageAction(
  userId: string,
  ids: readonly string[],
  action: MessageAction,
  signal: AbortSignal = new AbortController().signal,
) {
  const data = await readWorkspaceResponse('/api/mail/messages/actions', userId, signal, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids, action }),
  })
  return resultsSchema.parse(data).results
}
