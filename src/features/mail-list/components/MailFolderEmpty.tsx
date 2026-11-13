import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@mailflow/ui/components'
import {
  Archive,
  Inbox,
  type LucideIcon,
  Search,
  ShieldAlert,
  Star,
  Trash2,
} from '@mailflow/ui/icons'
import type { MailFolderName } from '../types/mailFolder'

const folderCopy: Record<MailFolderName, { Icon: LucideIcon; title: string; description: string }> =
  {
    inbox: {
      Icon: Inbox,
      title: 'Inbox is empty',
      description: 'New messages for this workspace arrive here.',
    },
    starred: {
      Icon: Star,
      title: 'No starred messages',
      description: 'Star a message to find it here later. Stars are only visible to you.',
    },
    archive: {
      Icon: Archive,
      title: 'No archived messages',
      description: 'Archived messages leave the Inbox for the whole workspace and wait here.',
    },
    spam: {
      Icon: ShieldAlert,
      title: 'No spam',
      description: 'Messages reported as spam appear here.',
    },
    trash: {
      Icon: Trash2,
      title: 'Trash is empty',
      description: 'Deleted messages stay here until they are deleted permanently.',
    },
  }

export function MailFolderEmpty({ folder, q }: { folder: MailFolderName; q: string }) {
  const search = q.trim()
  const { Icon, title, description } = search
    ? {
        Icon: Search,
        title: `No messages match “${search}”`,
        description: 'Check the spelling or try other words.',
      }
    : folderCopy[folder]
  return (
    <Empty className="py-12">
      <EmptyHeader>
        <EmptyMedia>
          <Icon />
        </EmptyMedia>
        <EmptyTitle render={(props) => <h2 {...props} />}>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
