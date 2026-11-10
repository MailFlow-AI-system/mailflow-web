import { z } from 'zod'

import { normalizeLink } from '../editor/links'
import type { LinkValues } from '../types/LinkValues'

export const linkSchema = z.object({
  url: z
    .string()
    .refine(
      (value) => normalizeLink(value) !== null,
      'Enter a valid HTTP, HTTPS or mailto address.',
    ),
}) satisfies z.ZodType<LinkValues>
