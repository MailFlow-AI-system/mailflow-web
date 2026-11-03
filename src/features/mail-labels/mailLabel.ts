import { z } from 'zod'

export const mailLabelSchema = z.object({ id: z.uuid(), name: z.string(), color: z.string() })
export type MailLabel = z.infer<typeof mailLabelSchema>
