import { Button, Tooltip, TooltipContent, TooltipTrigger } from '@mailflow/ui/components'
import { Star } from '@mailflow/ui/icons'
import { useQueryClient } from '@tanstack/react-query'
import { type ReactNode, useEffect } from 'react'
import { useMailDetail } from '#/features/mail-reader/useMailDetail'
import { folderMoveActions, moveActionLabels } from '../folderActions'
import type { MessageAction } from '../messageActions'
import { moveActionIcons, readToggle } from './actionPresentation'
import { useMailActions } from './MailActionsProvider'

function ReaderButton({
  label,
  onClick,
  pressed,
  disabled,
  children,
}: {
  label: string
  onClick: () => void
  pressed?: boolean
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            aria-label={label}
            aria-pressed={pressed}
            className="h-8 w-8"
            disabled={disabled}
            onClick={onClick}
            size="icon"
            type="button"
            variant="ghost"
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

/** Folder actions for the message open in the reader. */
export function ReaderMessageActions({ userId, id }: { userId: string; id: string }) {
  const actions = useMailActions()
  // Shares the reader's query, so this adds no request.
  const detail = useMailDetail(userId, 'messages', id)
  const queryClient = useQueryClient()
  const loadedId = detail.data?.id
  // Core marked the message read while serving it, so the unread badges are now stale.
  useEffect(() => {
    if (loadedId) void queryClient.invalidateQueries({ queryKey: ['mail-unread-counts', userId] })
  }, [loadedId, queryClient, userId])
  if (!actions) return null
  const { folder, request } = actions
  const run = (action: MessageAction) => request([id], action)
  const message = detail.data
  const read = readToggle(message?.isRead !== false && message !== undefined)
  const starred = Boolean(message?.isStarred)
  const starrable = folder !== 'trash' && folder !== 'spam'

  return (
    <>
      {folderMoveActions(folder).map((action) => {
        const Icon = moveActionIcons[action]
        return (
          <ReaderButton key={action} label={moveActionLabels[action]} onClick={() => run(action)}>
            <Icon aria-hidden="true" className="h-3.5 w-3.5" />
          </ReaderButton>
        )
      })}
      <ReaderButton label={read.label} disabled={!message} onClick={() => run(read.action)}>
        <read.Icon aria-hidden="true" className="h-3.5 w-3.5" />
      </ReaderButton>
      {starrable ? (
        <ReaderButton
          label="Star"
          pressed={starred}
          disabled={!message}
          onClick={() => run(starred ? 'unstar' : 'star')}
        >
          <Star
            aria-hidden="true"
            className={`h-3.5 w-3.5 ${starred ? 'fill-warning text-warning' : ''}`}
          />
        </ReaderButton>
      ) : null}
    </>
  )
}
