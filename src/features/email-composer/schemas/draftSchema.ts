import { z } from 'zod'

import { COMPOSITION_VALIDATION_MESSAGES } from '../composerValidationConstants'
import type { DraftValues } from '../types/DraftValues'
import {
  getAttachmentSizeIssues,
  invalidRecipientAddresses,
  splitRecipientList,
} from './compositionSchema'

const recipientList = z
  .string()
  .trim()
  .superRefine((value, context) => {
    if (invalidRecipientAddresses(splitRecipientList(value)).length > 0) {
      context.addIssue({
        code: 'custom',
        message: COMPOSITION_VALIDATION_MESSAGES.invalidRecipients,
      })
    }
  })

const attachments = z
  .array(
    z.object({
      id: z.string(),
      file: z.custom<File>((value) => value instanceof File),
    }),
  )
  .superRefine((values, context) => {
    for (const issue of getAttachmentSizeIssues(values.map(({ file }) => file.size))) {
      context.addIssue({
        code: 'custom',
        path: 'attachmentIndex' in issue ? [issue.attachmentIndex, 'file'] : ['root'],
        message: issue.message,
      })
    }
  })

export const draftSchema = z.object({
  to: recipientList,
  cc: recipientList,
  bcc: recipientList,
  subject: z.string(),
  body: z.string(),
  attachments,
}) satisfies z.ZodType<DraftValues>
