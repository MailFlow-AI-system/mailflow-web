import type { Attachment, DraftFields } from './types/composer'

export const emptyFields: DraftFields = { to: '', cc: '', bcc: '', subject: '' }
export const emptyBody = '<p></p>'

export function draftSignature(fields: DraftFields, body: string, attachments: Attachment[]) {
  return JSON.stringify({ fields, body, attachments: attachments.map(({ id }) => id) })
}
