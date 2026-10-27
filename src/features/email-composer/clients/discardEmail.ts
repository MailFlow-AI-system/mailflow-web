import { z } from 'zod'
import { type EmailDeliveryContext, EmailDeliveryError } from '../types/EmailDelivery'
import { mailRequestFailure, resolveDeliveryScope } from './mailContext'

const failure = 'Não foi possível concluir o descarte. O rascunho foi mantido. Tente novamente.'
const responseSchema = z.strictObject({
  status: z.literal('discarded'),
  retainedMessageIds: z.array(z.uuid()).max(100),
})

type DiscardSelection = { messageIds: string[]; attachmentIds: string[] }

export async function discardEmail(
  context: EmailDeliveryContext,
  selection: DiscardSelection = {
    messageIds: [...(context.messageIds ?? [])],
    attachmentIds: [
      ...(context.attachmentIds ?? []),
      ...[...context.uploads.values()].map(({ id }) => id),
    ],
  },
) {
  const messageIds = [...new Set(selection.messageIds)]
  const attachmentIds = [...new Set(selection.attachmentIds)]
  if (!messageIds.length && !attachmentIds.length) return { retainedMessageIds: [] as string[] }
  try {
    const scope = await resolveDeliveryScope(context)
    const retainedMessageIds = new Set<string>()
    for (let index = 0; index < Math.max(messageIds.length, attachmentIds.length); index += 100) {
      const messages = messageIds.slice(index, index + 100)
      const response = await fetch('/api/mail/discard', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Workspace-Id': scope.workspace.id,
          'X-Workspace-Identity': scope.userId,
        },
        signal: AbortSignal.timeout(45_000),
        body: JSON.stringify({
          messageIds: messages,
          attachmentIds: attachmentIds.slice(index, index + 100),
        }),
      })
      if (!response.ok) throw await mailRequestFailure(response, failure)
      const result = responseSchema.parse(await response.json())
      for (const id of result.retainedMessageIds) {
        if (!messages.includes(id)) throw new EmailDeliveryError(failure)
        retainedMessageIds.add(id)
      }
    }
    return { retainedMessageIds: [...retainedMessageIds] }
  } catch (error) {
    if (error instanceof EmailDeliveryError) throw error
    throw new EmailDeliveryError(failure)
  }
}
