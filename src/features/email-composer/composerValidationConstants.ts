export const COMPOSITION_ATTACHMENT_MAX_SIZE = 10 * 1024 * 1024
export const COMPOSITION_ATTACHMENTS_MAX_TOTAL_SIZE = 25 * 1024 * 1024

export const COMPOSITION_VALIDATION_MESSAGES = {
  emptyBody: 'O corpo do e-mail está vazio. Deseja continuar mesmo assim?',
  emptySubject: 'O assunto está vazio. Deseja continuar mesmo assim?',
  invalidRecipients: 'Informe e-mails válidos.',
  noRecipients: 'Adicione pelo menos um destinatário.',
  attachmentTooLarge: 'Cada anexo deve ter no máximo 10 MiB.',
  attachmentsTotalTooLarge: 'Os anexos devem somar no máximo 25 MiB.',
} as const
