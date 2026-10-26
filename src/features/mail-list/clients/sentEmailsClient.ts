import { z } from 'zod'

const sentEmailSchema = z.object({
  id: z.string(),
  to: z.array(z.string()),
  cc: z.array(z.string()),
  bcc: z.array(z.string()),
  subject: z.string(),
  text: z.string(),
  sentAt: z.string().nullable(),
})
const pageSchema = z.object({ items: z.array(sentEmailSchema), nextOffset: z.number().nullable() })
export async function fetchSentEmails(offset: number, signal: AbortSignal) {
  const response = await fetch(`/api/mail/sent?offset=${offset}`, {
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
    signal,
  })
  if (!response.ok) throw new Error('Não foi possível carregar os e-mails enviados.')
  return pageSchema.parse(await response.json())
}
