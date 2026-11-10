import { z } from 'zod'
import { workspaceSchema } from '#/features/workspaces/schemas'
import { type EmailDeliveryContext, EmailDeliveryError } from '../types/EmailDelivery'

const sessionChanged =
  'Your session changed. Your message was kept. Return to the original account before trying again.'
const selectorSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[\x21-\x2b\x2d-\x7e]+$/)
const contextSchema = z.object({
  userId: selectorSchema,
  workspace: workspaceSchema.extend({ id: selectorSchema }),
})

export async function mailRequestFailure(response: Response, fallback: string) {
  const problem: unknown = await response.json().catch(() => null)
  const code = problem && typeof problem === 'object' && 'code' in problem ? problem.code : null
  if (response.status === 401 || code === 'workspace_identity_changed')
    return new EmailDeliveryError(sessionChanged)
  if (code === 'workspace_required')
    return new EmailDeliveryError(
      'Set a default workspace with permission to send. Your message was kept. Try again after configuring the workspace.',
    )
  if (code === 'workspace_unavailable')
    return new EmailDeliveryError(
      'The sending workspace is unavailable. Your message was kept. Confirm your workspace access and try again.',
    )
  return new EmailDeliveryError(fallback)
}

export async function resolveDeliveryScope(context: EmailDeliveryContext) {
  const userId = context.userId ?? context.scope.current?.userId
  const response = await fetch('/api/mail/context', {
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { Accept: 'application/json', ...(userId ? { 'X-Workspace-Identity': userId } : {}) },
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok)
    throw await mailRequestFailure(
      response,
      'The sending workspace could not be set. Your message was kept. Try again.',
    )
  const scope = contextSchema.parse(await response.json())
  if (userId && scope.userId !== userId) throw new EmailDeliveryError(sessionChanged)
  const pinned = context.scope.current
  if (pinned && pinned.userId !== scope.userId) throw new EmailDeliveryError(sessionChanged)
  if (pinned && pinned.workspace.id !== scope.workspace.id)
    throw new EmailDeliveryError(
      `The sending workspace changed. Your message was kept. Return to the workspace "${pinned.workspace.name}" before trying again.`,
    )
  context.scope.current ??= scope
  return context.scope.current
}
