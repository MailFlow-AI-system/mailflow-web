import { z } from 'zod'

import type { DraftValues } from '../types/DraftValues'

const optionalEmail = z
  .string()
  .trim()
  .refine(
    (value) => value === '' || z.email().safeParse(value).success,
    'Informe um e-mail válido.',
  )

export const draftSchema = z.object({
  to: optionalEmail,
  cc: optionalEmail,
  bcc: optionalEmail,
  subject: z.string(),
  body: z.string(),
  attachments: z.array(
    z.object({
      id: z.string(),
      file: z.custom<File>((value) => value instanceof File),
    }),
  ),
}) satisfies z.ZodType<DraftValues>
