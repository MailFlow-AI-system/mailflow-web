// Workspace mail folders served by the messages list. Sent and drafts have their own endpoints.
export const mailFolders = ['inbox', 'starred', 'archive', 'spam', 'trash'] as const

export type MailFolderName = (typeof mailFolders)[number]

export function isMailFolderName(value: unknown): value is MailFolderName {
  return typeof value === 'string' && (mailFolders as readonly string[]).includes(value)
}
