import { z } from 'zod'
import { mailLabelSchema } from '#/features/mail-labels/mailLabel'
import type { MailDeliveryScope } from '../types/EmailDelivery'

const pageSchema = z.object({
  items: z.array(mailLabelSchema),
  nextCursor: z.string().nullable(),
  exactMatch: mailLabelSchema.nullable(),
})

export type { MailLabel } from '#/features/mail-labels/mailLabel'

async function request(scope: MailDeliveryScope, path: string, init?: RequestInit) {
  const response = await fetch(
    `/api/mail/labels/${encodeURIComponent(scope.workspace.slug)}${path}`,
    {
      ...init,
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'X-Workspace-Identity': scope.userId,
        ...init?.headers,
      },
    },
  )
  if (!response.ok) throw new Error('The labels could not be updated.')
  return response.json()
}

export function searchLabels(
  scope: MailDeliveryScope,
  query: string,
  cursor: string | null,
  signal: AbortSignal,
) {
  const params = new URLSearchParams({ q: query })
  if (cursor) params.set('cursor', cursor)
  return request(scope, `?${params}`, { signal }).then(pageSchema.parse)
}

const paletteSchema = z
  .object({
    colors: z.array(z.string().regex(/^#[0-9a-f]{6}$/)).min(1),
    suggestedColor: z.string(),
  })
  .refine(({ colors, suggestedColor }) => colors.includes(suggestedColor))

export function fetchLabelPalette(scope: MailDeliveryScope, signal: AbortSignal) {
  return request(scope, '/palette', { signal }).then(paletteSchema.parse)
}

export function createLabel(scope: MailDeliveryScope, name: string, color: string) {
  return request(scope, '', {
    method: 'POST',
    signal: AbortSignal.timeout(15_000),
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, color }),
  }).then(mailLabelSchema.parse)
}

export async function assignSentLabels(scope: MailDeliveryScope, id: string, labelIds: string[]) {
  for (const labelId of labelIds) {
    await request(scope, `/sent/${encodeURIComponent(id)}/${encodeURIComponent(labelId)}`, {
      method: 'PUT',
      signal: AbortSignal.timeout(15_000),
    })
  }
}
