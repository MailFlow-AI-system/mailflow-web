import type { DraftFields } from './types/composer'
import type { Attachment } from './types/DraftValues'

export const emptyFields: DraftFields = { to: '', cc: '', bcc: '', subject: '' }
export const emptyBody = '<p></p>'

export function draftSignature(fields: DraftFields, body: string, attachments: Attachment[]) {
  return JSON.stringify({ fields, body, attachments: attachments.map(({ id }) => id) })
}

export function draftFieldsSignature(fields: DraftFields, attachments: Attachment[]) {
  return JSON.stringify({ fields, attachments: attachments.map(({ id }) => id) })
}
