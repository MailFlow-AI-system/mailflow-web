import { z } from 'zod'

export const mailDetailSchema = z.object({
  id: z.string(),
  subject: z.string(),
  senderName: z.string().nullable(),
  senderEmail: z.string().nullable(),
  to: z.array(z.string()),
  cc: z.array(z.string()),
  bcc: z.array(z.string()),
  html: z.string().nullable(),
  text: z.string(),
  date: z.string(),
  attachments: z.array(
    z.object({
      id: z.string(),
      filename: z.string(),
      contentType: z.string(),
      size: z.number().nonnegative(),
      contentId: z.string().nullable(),
    }),
  ),
})
export type MailDetail = z.infer<typeof mailDetailSchema>
export type MailAttachment = MailDetail['attachments'][number]
export type MailFolder = 'messages' | 'sent'
