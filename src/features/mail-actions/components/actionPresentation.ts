import {
  Archive,
  ArchiveRestore,
  Inbox,
  type LucideIcon,
  Mail,
  MailOpen,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from '@mailflow/ui/icons'
import type { MoveAction } from '../folderActions'

export const moveActionIcons: Record<MoveAction, LucideIcon> = {
  archive: Archive,
  unarchive: Inbox,
  trash: Trash2,
  restore: ArchiveRestore,
  spam: ShieldAlert,
  not_spam: ShieldCheck,
  delete_permanently: Trash2,
}

/** The read-state control shows what it will do next. */
export function readToggle(isRead: boolean) {
  return isRead
    ? { action: 'unread' as const, label: 'Mark as unread', Icon: Mail }
    : { action: 'read' as const, label: 'Mark as read', Icon: MailOpen }
}
