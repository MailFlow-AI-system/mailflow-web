export type CompositionAttachmentMetadata = {
  id: string
  name: string
  size: number
}

export type CompositionValidationInput = {
  to: string
  cc: string
  bcc: string
  subject: string
  body: string
  hasBodyContent: boolean
  attachments: CompositionAttachmentMetadata[]
}

export type NormalizedComposition = {
  to: string[]
  cc: string[]
  bcc: string[]
  subject: string
  body: string
  attachments: CompositionAttachmentMetadata[]
}

export type CompositionValidationIssue = {
  field: 'to' | 'cc' | 'bcc' | 'attachments'
  message: string
  attachmentIndex?: number
}

export type CompositionWarning = {
  code: 'empty-subject' | 'empty-body'
  field: 'subject' | 'body'
  message: string
}

export type CompositionValidationResult =
  | {
      success: true
      issues: []
      warnings: CompositionWarning[]
      composition: NormalizedComposition
    }
  | {
      success: false
      issues: [CompositionValidationIssue, ...CompositionValidationIssue[]]
      warnings: CompositionWarning[]
    }
