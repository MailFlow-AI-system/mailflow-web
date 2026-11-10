export const COMPOSITION_ATTACHMENT_MAX_SIZE = 10_000_000
export const COMPOSITION_ATTACHMENTS_MAX_TOTAL_SIZE = 20_000_000

export const COMPOSITION_ATTACHMENTS_MAX_COUNT = 10

export const COMPOSITION_VALIDATION_MESSAGES = {
  emptyBody: 'The email body is empty. Do you want to continue anyway?',
  emptySubject: 'The subject is empty. Do you want to continue anyway?',
  invalidRecipientName: 'The name must be at most 200 characters and cannot contain line breaks.',
  invalidRecipients: 'Enter valid email addresses.',
  noRecipients: 'Add at least one recipient in To.',
  tooManyAttachments: 'Add at most 10 files, including images.',
  attachmentTooLarge: 'Each attachment must be at most 10 MB.',
  attachmentsTotalTooLarge: 'Attachments must total at most 20 MB.',
  continuationFailed: 'The email could not be sent. Your message was kept. Try again.',
} as const
