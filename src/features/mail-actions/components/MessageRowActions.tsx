import { Button, Tooltip, TooltipContent, TooltipTrigger } from '@mailflow/ui/components'
import { Star } from '@mailflow/ui/icons'
import type { ReactNode } from 'react'
import type { MailMessage } from '#/features/mail-list/types/mailMessage'
import { folderMoveActions, type MoveAction } from '../folderActions'
import type { MessageAction } from '../messageActions'
import { moveActionIcons, readToggle } from './actionPresentation'
import { useMailActions } from './MailActionsProvider'

const rowLabels: Record<MoveAction, string> = {
  archive: 'Archive message',
  unarchive: 'Move to Inbox',
  trash: 'Delete message',
  restore: 'Restore message',
  spam: 'Report spam',
  not_spam: 'Not spam',
  delete_permanently: 'Delete permanently',
}

function RowButton({
  label,
  tooltip,
  onClick,
  pressed,
  children,
}: {
  label: string
  tooltip: string
  onClick: () => void
  pressed?: boolean
  children: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            aria-label={label}
            aria-pressed={pressed}
            className="size-7 text-muted-foreground hover:text-foreground"
            onClick={onClick}
            size="icon"
            type="button"
            variant="ghost"
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  )
}

/** Star toggle plus quick actions revealed on hover or keyboard focus within the row. */
export function MessageRowActions({ message }: { message: MailMessage }) {
  const actions = useMailActions()
  if (!actions) return null
  const { folder, request } = actions
  const run = (action: MessageAction) => request([message.id], action)
  const moves = folderMoveActions(folder)
  const primary = moves[0]
  const destructive = moves.at(-1)
  const read = readToggle(message.isRead !== false)
  const starrable = folder !== 'trash' && folder !== 'spam'
  const starred = Boolean(message.isStarred)
  const subject = message.subject || '(No subject)'
  const moveButton = (action: MoveAction) => {
    const Icon = moveActionIcons[action]
    return (
      <RowButton
        label={`${rowLabels[action]}: ${subject}`}
        tooltip={rowLabels[action]}
        onClick={() => run(action)}
      >
        <Icon aria-hidden="true" />
      </RowButton>
    )
  }

  return (
    <>
      {starrable ? (
        <RowButton
          label={`Star message: ${subject}`}
          tooltip={starred ? 'Unstar' : 'Star'}
          pressed={starred}
          onClick={() => run(starred ? 'unstar' : 'star')}
        >
          <Star aria-hidden="true" className={starred ? 'fill-warning text-warning' : undefined} />
        </RowButton>
      ) : null}
      <div
        className="pointer-events-none absolute right-2 bottom-2 flex items-center gap-0.5 rounded-md border border-border bg-background p-0.5 opacity-0 shadow-sm transition-opacity focus-within:pointer-events-auto focus-within:opacity-100 group-hover/row:pointer-events-auto group-hover/row:opacity-100"
        data-slot="row-quick-actions"
      >
        {primary ? moveButton(primary) : null}
        <RowButton
          label={`${read.label}: ${subject}`}
          tooltip={read.label}
          onClick={() => run(read.action)}
        >
          <read.Icon aria-hidden="true" />
        </RowButton>
        {destructive && destructive !== primary ? moveButton(destructive) : null}
      </div>
    </>
  )
}
