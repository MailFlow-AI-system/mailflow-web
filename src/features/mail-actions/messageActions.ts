import type { MailFolderName } from '#/features/mail-list/types/mailFolder'
import type { MailMessage } from '#/features/mail-list/types/mailMessage'

export const messageActions = [
  'read',
  'unread',
  'star',
  'unstar',
  'archive',
  'unarchive',
  'trash',
  'restore',
  'spam',
  'not_spam',
  'delete_permanently',
] as const

export type MessageAction = (typeof messageActions)[number]

type MessageState = Pick<
  MailMessage,
  'isRead' | 'isStarred' | 'archivedAt' | 'trashedAt' | 'spamAt'
>

const stateChanges: Record<
  Exclude<MessageAction, 'delete_permanently'>,
  (at: string) => MessageState
> = {
  read: () => ({ isRead: true }),
  unread: () => ({ isRead: false }),
  star: () => ({ isStarred: true }),
  unstar: () => ({ isStarred: false }),
  archive: (at) => ({ archivedAt: at }),
  unarchive: () => ({ archivedAt: null }),
  trash: (at) => ({ trashedAt: at }),
  restore: () => ({ trashedAt: null }),
  spam: (at) => ({ spamAt: at }),
  not_spam: () => ({ spamAt: null }),
}

/** Returns the message as Core will store it after the action, or null once it no longer exists. */
export function applyMessageAction<T extends MailMessage>(
  message: T,
  action: MessageAction,
  at: string,
): T | null {
  if (action === 'delete_permanently') return null
  return { ...message, ...stateChanges[action](at) }
}

/** Mirrors Core's folder rules: Trash wins over Spam, and Spam over Archive. */
export function isInMailFolder(message: MailMessage, folder: MailFolderName) {
  const trashed = Boolean(message.trashedAt)
  const spam = !trashed && Boolean(message.spamAt)
  const archived = !trashed && !spam && Boolean(message.archivedAt)
  switch (folder) {
    case 'trash':
      return trashed
    case 'spam':
      return spam
    case 'archive':
      return archived
    case 'starred':
      return Boolean(message.isStarred) && !trashed && !spam
    case 'inbox':
      return !trashed && !spam && !archived
  }
}

const inverses: Record<MessageAction, MessageAction | null> = {
  read: 'unread',
  unread: 'read',
  star: 'unstar',
  unstar: 'star',
  archive: 'unarchive',
  unarchive: 'archive',
  trash: 'restore',
  restore: 'trash',
  spam: 'not_spam',
  not_spam: 'spam',
  delete_permanently: null,
}

export function inverseMessageAction(action: MessageAction) {
  return inverses[action]
}
