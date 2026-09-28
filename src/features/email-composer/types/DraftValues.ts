export type Attachment = { id: string; file: File }

export type DraftValues = {
  to: string
  cc: string
  bcc: string
  subject: string
  body: string
  attachments: Attachment[]
}
