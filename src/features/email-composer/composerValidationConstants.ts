export const COMPOSITION_ATTACHMENT_MAX_SIZE = 10 * 1024 * 1024
export const COMPOSITION_ATTACHMENTS_MAX_TOTAL_SIZE = 25 * 1024 * 1024

export const COMPOSITION_VALIDATION_MESSAGES = {
  emptyBody: 'O corpo do e-mail está vazio. Deseja continuar mesmo assim?',
  emptySubject: 'O assunto está vazio. Deseja continuar mesmo assim?',
  invalidRecipientName: 'O nome deve ter até 200 caracteres e não pode conter quebras de linha.',
  invalidRecipients: 'Informe e-mails válidos.',
  noRecipients: 'Adicione pelo menos um destinatário em Para.',
  attachmentTooLarge: 'Cada anexo deve ter no máximo 10 MiB.',
  attachmentsTotalTooLarge: 'Os anexos devem somar no máximo 25 MiB.',
  continuationFailed:
    'Não foi possível enviar o e-mail. Sua mensagem foi mantida. Tente novamente.',
} as const
