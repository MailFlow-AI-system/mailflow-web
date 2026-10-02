import { z } from 'zod'

import {
  COMPOSITION_ATTACHMENT_MAX_SIZE,
  COMPOSITION_ATTACHMENTS_MAX_TOTAL_SIZE,
  COMPOSITION_VALIDATION_MESSAGES,
} from '../composerValidationConstants'

const emailSchema = z.email()

export function splitRecipientList(value: string): string[] {
  return value
    .split(/[;,]/)
    .map((address) => address.trim())
    .filter(Boolean)
}

export function invalidRecipientAddresses(addresses: readonly string[]): string[] {
  return addresses.filter((address) => !emailSchema.safeParse(address).success)
}

type AttachmentSizeIssue = { attachmentIndex: number; message: string } | { message: string }

export function getAttachmentSizeIssues(sizes: readonly number[]): AttachmentSizeIssue[] {
  const issues: AttachmentSizeIssue[] = []

  sizes.forEach((size, attachmentIndex) => {
    if (size > COMPOSITION_ATTACHMENT_MAX_SIZE) {
      issues.push({ attachmentIndex, message: COMPOSITION_VALIDATION_MESSAGES.attachmentTooLarge })
    }
  })

  if (sizes.reduce((total, size) => total + size, 0) > COMPOSITION_ATTACHMENTS_MAX_TOTAL_SIZE) {
    issues.push({ message: COMPOSITION_VALIDATION_MESSAGES.attachmentsTotalTooLarge })
  }

  return issues
}

const compositionRecipientSchema = z
  .string()
  .transform(splitRecipientList)
  .superRefine((addresses, context) => {
    if (invalidRecipientAddresses(addresses).length > 0) {
      context.addIssue({
        code: 'custom',
        message: COMPOSITION_VALIDATION_MESSAGES.invalidRecipients,
      })
    }
  })

const attachmentMetadataSchema = z.object({
  id: z.string(),
  name: z.string(),
  size: z.number(),
})

export const compositionSchema = z
  .object({
    to: compositionRecipientSchema,
    cc: compositionRecipientSchema,
    bcc: compositionRecipientSchema,
    subject: z.string(),
    body: z.string(),
    hasBodyContent: z.boolean(),
    attachments: z.array(attachmentMetadataSchema),
  })
  .superRefine((composition, context) => {
    if (composition.to.length + composition.cc.length + composition.bcc.length === 0) {
      context.addIssue({
        code: 'custom',
        path: ['to'],
        message: COMPOSITION_VALIDATION_MESSAGES.noRecipients,
      })
    }

    for (const issue of getAttachmentSizeIssues(composition.attachments.map(({ size }) => size))) {
      const path =
        'attachmentIndex' in issue ? ['attachments', issue.attachmentIndex] : ['attachments']
      context.addIssue({
        code: 'custom',
        path,
        message: issue.message,
      })
    }
  })
