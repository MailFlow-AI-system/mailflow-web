import { z } from 'zod'
import { mailLabelSchema } from '#/features/mail-labels/mailLabel'
import type { DraftValues } from '../types/DraftValues'
import { type EmailDeliveryContext, EmailDeliveryError } from '../types/EmailDelivery'
import { mailRequestFailure, resolveDeliveryScope } from './mailContext'
import { prepareEmail } from './sendEmail'

const attachmentSchema = z.object({
  id: z.uuid(),
  filename: z.string(),
  contentType: z.string(),
  size: z.number().int().min(0).max(10_000_000),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  contentId: z.string().nullable(),
})
const draftSchema = z.object({
  id: z.uuid(),
  version: z.number().int().positive(),
  to: z.string(),
  cc: z.string(),
  bcc: z.string(),
  recipientName: z.string(),
  subject: z.string(),
  html: z.string(),
  text: z.string(),
  updatedAt: z.string(),
  attachments: z.array(attachmentSchema).max(10),
  labels: z.array(mailLabelSchema),
})
export const draftPageSchema = z.object({
  items: z.array(
    z.object({
      id: z.uuid(),
      version: z.number().int(),
      to: z.string(),
      recipientName: z.string().trim().default(''),
      subject: z.string(),
      text: z.string(),
      updatedAt: z.string(),
      attachmentCount: z.number().int(),
    }),
  ),
  nextOffset: z.number().nullable(),
})
const discardResultSchema = z.object({
  results: z.array(z.object({ id: z.uuid(), status: z.enum(['discarded', 'conflict']) })),
})
export type DraftListItem = z.infer<typeof draftPageSchema>['items'][number]
export type DraftSnapshot = { values: DraftValues; labels: z.infer<typeof mailLabelSchema>[] }
export type DraftSave = DraftSnapshot & { id: string; version: number; mutationId: string }

export class DraftConflictError extends EmailDeliveryError {}
export class DraftRejectedError extends EmailDeliveryError {}
export async function draftRequest(
  path: string,
  context: EmailDeliveryContext,
  init: RequestInit = {},
) {
  const scope = await resolveDeliveryScope(context)
  const response = await fetch(`/api/mail/drafts${path}`, {
    ...init,
    credentials: 'same-origin',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Workspace-Id': scope.workspace.id,
      'X-Workspace-Identity': scope.userId,
    },
    signal: AbortSignal.timeout(45_000),
  })
  if (response.status === 409)
    throw new DraftConflictError(
      'This draft was changed or deleted in another tab. Reopen the saved version before continuing.',
    )
  if (!response.ok) {
    const error = await mailRequestFailure(
      response,
      'The draft could not be saved. Your message was kept. Try again.',
    )
    if ([400, 403, 404, 413, 415].includes(response.status))
      throw new DraftRejectedError(error.message)
    throw error
  }
  if (
    response.headers.get('X-Workspace-Identity') !== scope.userId ||
    response.headers.get('X-Workspace-Id') !== scope.workspace.id
  )
    throw new EmailDeliveryError(
      'The account and workspace of the draft could not be confirmed. Your message was kept.',
    )
  return response
}
export async function saveDraft(input: DraftSave, context: EmailDeliveryContext) {
  const prepared = await prepareEmail(input.values, context).catch((error: unknown) => {
    throw new DraftRejectedError(
      error instanceof EmailDeliveryError
        ? error.message
        : 'The draft could not be prepared. Your message was kept.',
    )
  })
  const { body: _body, attachments: _files, ...fields } = input.values
  const response = await draftRequest(`/${input.id}`, context, {
    method: 'PUT',
    body: JSON.stringify({
      ...fields,
      html: prepared.html,
      text: prepared.text,
      attachments: prepared.attachments,
      labelIds: input.labels.map((label) => label.id),
      version: input.version,
      mutationId: input.mutationId,
    }),
  })
  const result = draftSchema.parse(await response.json())
  if (result.id !== input.id)
    throw new EmailDeliveryError('The saved draft could not be confirmed.')
  return result
}
export async function deleteDraft(id: string, version: number, context: EmailDeliveryContext) {
  await draftRequest(`/${id}`, context, { method: 'DELETE', body: JSON.stringify({ version }) })
}
export async function discardDrafts(
  items: { id: string; version: number }[],
  context: EmailDeliveryContext,
) {
  const response = await draftRequest('/discard', context, {
    method: 'POST',
    body: JSON.stringify({ items }),
  })
  return discardResultSchema.parse(await response.json()).results
}
function asDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new EmailDeliveryError('The draft image could not be recovered.'))
    reader.onload = () =>
      typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new Error('Invalid image'))
    reader.readAsDataURL(file)
  })
}
export async function readDraft(
  id: string,
  context: EmailDeliveryContext,
): Promise<DraftSnapshot & { id: string; version: number }> {
  const response = await draftRequest(`/${id}`, context)
  const record = draftSchema.parse(await response.json())
  if (record.id !== id) throw new EmailDeliveryError('The requested draft could not be recovered.')
  const scope = context.scope.current
  if (!scope) throw new EmailDeliveryError('The draft workspace is unavailable.')
  if (record.attachments.reduce((sum, file) => sum + file.size, 0) > 20_000_000)
    throw new EmailDeliveryError('The draft attachments exceed the limit.')
  const document = new DOMParser().parseFromString(record.html, 'text/html')
  const attachments: DraftValues['attachments'] = []
  for (const attachment of record.attachments) {
    const downloaded = await fetch(
      `/api/mail/attachments/${attachment.id}/${attachment.contentId ? 'inline' : 'download'}`,
      {
        credentials: 'same-origin',
        cache: 'no-store',
        signal: AbortSignal.timeout(45_000),
        headers: { 'X-Workspace-Id': scope.workspace.id, 'X-Workspace-Identity': scope.userId },
      },
    )
    if (
      !downloaded.ok ||
      downloaded.headers.get('X-Workspace-Identity') !== scope.userId ||
      downloaded.headers.get('X-Workspace-Id') !== scope.workspace.id
    )
      throw new EmailDeliveryError('The draft attachments could not be recovered. Try again.')
    const file = new File([await downloaded.blob()], attachment.filename, {
      type: attachment.contentType,
    })
    if (file.size !== attachment.size)
      throw new EmailDeliveryError('The recovered attachment is incomplete.')
    const source = attachment.contentId ? await asDataUrl(file) : undefined
    if (source)
      for (const image of document.querySelectorAll('img')) {
        if (image.getAttribute('src') === `cid:${attachment.contentId}`)
          image.setAttribute('src', source)
      }
    else attachments.push({ id: attachment.id, file })
    const metadata = {
      filename: file.name,
      contentType: file.type,
      size: file.size,
      sha256: attachment.sha256,
    }
    const localKey = attachment.contentId ?? `file:${attachment.id}`
    const key = JSON.stringify({ scope, key: localKey, ...metadata })
    context.uploads.set(key, {
      id: attachment.id,
      uploadUrl: '',
      headers: {},
      expiresAt: '',
      uploaded: true,
      clean: true,
      attachmentExpiresAt: new Date(0).toISOString(),
      localKey,
      ...(source ? { inlineSource: source } : {}),
    })
  }
  return {
    id: record.id,
    version: record.version,
    labels: record.labels,
    values: {
      to: record.to,
      cc: record.cc,
      bcc: record.bcc,
      recipientName: record.recipientName,
      subject: record.subject,
      body: document.body.innerHTML,
      attachments,
    },
  }
}
