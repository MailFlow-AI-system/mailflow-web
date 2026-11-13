import { Button, Tooltip, TooltipContent, TooltipTrigger } from '@mailflow/ui/components'
import { Star, StarOff } from '@mailflow/ui/icons'
import type { ReactNode } from 'react'
import type { MailMessage } from '#/features/mail-list/types/mailMessage'
import { useMailSelection } from '#/features/mail-selection/hooks/useMailSelection'
import { folderMoveActions, type MoveAction } from '../folderActions'
import { moveActionIcons, readToggle } from './actionPresentation'
import { useMailActions } from './MailActionsProvider'

const bulkLabels: Record<MoveAction, string> = {
  archive: 'Archive',
  unarchive: 'Move to Inbox',
  trash: 'Delete',
  restore: 'Restore',
  spam: 'Report spam',
  not_spam: 'Not spam',
  delete_permanently: 'Delete permanently',
}

function BulkButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
  // The name starts with the visible label; on narrow lists only the icon and tooltip show.
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            aria-label={`${label}: selected messages`}
            className="h-7 gap-1.5 px-2 text-xs"
            onClick={onClick}
            size="sm"
            type="button"
            variant="ghost"
          />
        }
      >
        {children}
        <span className="hidden xl:inline">{label}</span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

/** Selection-bar actions for the current folder, applied to every selected message. */
export function MessageBulkActions({ messages }: { messages: readonly MailMessage[] }) {
  const actions = useMailActions()
  const selection = useMailSelection()
  if (!actions || !selection || selection.ids.length === 0) return null
  const { folder, request } = actions
  const ids = selection.ids
  const selected = new Set(ids)
  const loaded = messages.filter((message) => selected.has(message.id))
  const read = readToggle(loaded.every((message) => message.isRead !== false))
  const starAll = loaded.some((message) => !message.isStarred)
  const starrable = folder !== 'trash' && folder !== 'spam'

  return (
    <>
      {folderMoveActions(folder).map((action) => {
        const Icon = moveActionIcons[action]
        return (
          <BulkButton
            key={action}
            label={bulkLabels[action]}
            onClick={() => request(ids, action, { onDone: selection.clear })}
          >
            <Icon aria-hidden="true" className="size-3.5" />
          </BulkButton>
        )
      })}
      <BulkButton label={read.label} onClick={() => request(ids, read.action)}>
        <read.Icon aria-hidden="true" className="size-3.5" />
      </BulkButton>
      {starrable ? (
        <BulkButton
          label={starAll ? 'Star' : 'Unstar'}
          onClick={() => request(ids, starAll ? 'star' : 'unstar')}
        >
          {starAll ? (
            <Star aria-hidden="true" className="size-3.5" />
          ) : (
            <StarOff aria-hidden="true" className="size-3.5" />
          )}
        </BulkButton>
      ) : null}
    </>
  )
}
