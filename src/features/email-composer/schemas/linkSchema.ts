import { z } from 'zod'

import { normalizeLink } from '../editor/links'
import type { LinkValues } from '../types/LinkValues'

export const linkSchema = z.object({
  url: z
    .string()
    .refine(
      (value) => normalizeLink(value) !== null,
      'Informe um endereço HTTP, HTTPS ou mailto válido.',
    ),
}) satisfies z.ZodType<LinkValues>
