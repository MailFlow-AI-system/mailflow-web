import { z } from 'zod'
import { workspaceSchema } from '#/features/workspaces/schemas'
import { type EmailDeliveryContext, EmailDeliveryError } from '../types/EmailDelivery'

const sessionChanged =
  'Sua sessão mudou. Sua mensagem foi mantida. Volte à conta original antes de tentar novamente.'
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
      'Defina um workspace padrão com acesso para enviar. Sua mensagem foi mantida. Tente novamente após configurar o workspace.',
    )
  if (code === 'workspace_unavailable')
    return new EmailDeliveryError(
      'O workspace de envio está indisponível. Sua mensagem foi mantida. Confirme seu acesso ao workspace e tente novamente.',
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
      'Não foi possível definir o workspace de envio. Sua mensagem foi mantida. Tente novamente.',
    )
  const scope = contextSchema.parse(await response.json())
  if (userId && scope.userId !== userId) throw new EmailDeliveryError(sessionChanged)
  const pinned = context.scope.current
  if (pinned && pinned.userId !== scope.userId) throw new EmailDeliveryError(sessionChanged)
  if (pinned && pinned.workspace.id !== scope.workspace.id)
    throw new EmailDeliveryError(
      `O workspace de envio mudou. Sua mensagem foi mantida. Volte ao workspace "${pinned.workspace.name}" antes de tentar novamente.`,
    )
  context.scope.current ??= scope
  return context.scope.current
}
