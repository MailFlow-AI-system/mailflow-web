import type { MailFolderName } from '#/features/mail-list/types/mailFolder'
import type { MessageAction } from './messageActions'

type MoveAction = Extract<
  MessageAction,
  'archive' | 'unarchive' | 'trash' | 'restore' | 'spam' | 'not_spam' | 'delete_permanently'
>

/** Actions that take messages out of the current folder, in display order. */
export function folderMoveActions(folder: MailFolderName): MoveAction[] {
  switch (folder) {
    case 'trash':
      return ['restore', 'delete_permanently']
    case 'spam':
      return ['not_spam', 'trash']
    case 'archive':
      return ['unarchive', 'spam', 'trash']
    default:
      return ['archive', 'spam', 'trash']
  }
}

export function needsConfirmation(action: MessageAction) {
  return action === 'trash' || action === 'delete_permanently'
}

export const moveActionLabels: Record<MoveAction, string> = {
  archive: 'Archive',
  unarchive: 'Move to Inbox',
  trash: 'Delete',
  restore: 'Restore',
  spam: 'Report spam',
  not_spam: 'Not spam',
  delete_permanently: 'Delete permanently',
}

export type { MoveAction }
