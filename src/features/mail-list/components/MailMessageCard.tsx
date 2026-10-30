import { Avatar, AvatarFallback, Checkbox } from '@mailflow/ui/components'
import { useEffect, useId, useRef } from 'react'
import { useLongPress } from '#/features/mail-selection/hooks/useLongPress'
import { getSenderAvatarColorClass } from '../senderAvatarColor'
import type { MailMessage } from '../types/mailMessage'

type MailMessageCardProps = {
  message: MailMessage
  selected?: boolean
  active?: boolean
  onSelect?: (id: string) => void
  onSelectedChange?: (selected: boolean) => void
  variant?: 'pointer' | 'touch'
  selecting?: boolean
  onLongPress?: () => void
}

function senderInitials(senderName: string) {
  const names = senderName.trim().split(/\s+/).filter(Boolean)
  return names
    .slice(0, 2)
    .map((name) => name[0]?.toUpperCase() ?? '')
    .join('')
}

function MessageText({ message }: { message: MailMessage }) {
  return (
    <span className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="block truncate text-xs font-medium">{message.senderName}</span>
      <span className="block truncate text-xs font-medium">{message.subject}</span>
      <span className="block truncate whitespace-nowrap text-[11px] text-muted-foreground">
        {message.body}
      </span>
    </span>
  )
}

export function MailMessageCard({
  message,
  selected = false,
  active = false,
  onSelect,
  onSelectedChange,
  variant = 'pointer',
  selecting = false,
  onLongPress,
}: MailMessageCardProps) {
  const checkboxId = useId()
  const nameId = useId()
  const suppressClick = useRef(false)
  useEffect(() => {
    if (!selecting) suppressClick.current = false
  }, [selecting])
  const longPress = useLongPress(() => {
    suppressClick.current = true
    onLongPress?.()
  })
  const touchEvents = {
    onPointerDownCapture: () => {
      suppressClick.current = false
    },
    onClickCapture: (event: React.MouseEvent) => {
      if (suppressClick.current) {
        suppressClick.current = false
        event.preventDefault()
        event.stopPropagation()
      }
    },
  }
  const selectable = onSelectedChange !== undefined
  const initials = senderInitials(message.senderName) || '?'
  const avatarColor = getSenderAvatarColorClass(message.senderName, message.recipientEmail)
  const label = `Select message from ${message.senderName}: ${message.subject}`
  const avatar = (swap: boolean) => (
    <Avatar
      aria-hidden="true"
      className={
        swap
          ? `pointer-events-none col-start-1 row-start-1 size-9 transition-opacity ${selected ? 'opacity-0' : 'group-hover/row:opacity-0 group-has-[:focus-visible]/row:opacity-0 group-data-[selecting=true]/list:opacity-0'}`
          : 'size-9'
      }
    >
      <AvatarFallback className={`text-[11px] font-medium ${avatarColor}`}>
        {initials}
      </AvatarFallback>
    </Avatar>
  )

  // Touch, selection mode: no hover to rely on, so the whole row is the tap target.
  if (selectable && variant === 'touch' && selecting) {
    return (
      <li
        className={`border-b border-border ${selected ? 'bg-primary/10' : active ? 'bg-primary/5' : ''} ${active ? 'border-l-2 border-l-primary' : ''}`}
        data-selected={selected}
        {...touchEvents}
      >
        <label
          className={`flex min-h-[88px] w-full min-w-0 cursor-pointer select-none items-start gap-2 py-4 pr-3 active:bg-muted/40 ${active ? 'pl-0.5' : 'pl-1'}`}
          htmlFor={checkboxId}
        >
          <span className="-my-1 grid size-11 shrink-0 place-items-center">
            {/* The wrapping label would otherwise name the box after the whole row. */}
            <span className="sr-only" id={nameId}>
              {label}
            </span>
            <Checkbox
              aria-labelledby={nameId}
              checked={selected}
              className="size-[22px] rounded-[6px]"
              id={checkboxId}
              onCheckedChange={(checked) => onSelectedChange(checked)}
            />
          </span>
          {avatar(false)}
          <MessageText message={message} />
        </label>
      </li>
    )
  }

  // Touch, idle: nothing hidden to discover; holding a row starts selecting.
  if (selectable && variant === 'touch') {
    return (
      <li
        className={`border-b border-border ${active ? 'border-l-2 border-l-primary bg-primary/5' : ''}`}
        data-selected={false}
        {...touchEvents}
      >
        <button
          type="button"
          aria-current={active ? 'true' : undefined}
          onClick={() => onSelect?.(message.id)}
          className={`flex min-h-[88px] w-full min-w-0 cursor-pointer select-none items-start gap-3 py-4 pr-4 text-left [-webkit-touch-callout:none] ${active ? 'pl-[14px]' : 'pl-4'}`}
          {...longPress}
        >
          {avatar(false)}
          <MessageText message={message} />
        </button>
      </li>
    )
  }

  return (
    <li
      className={`group/row border-b border-border py-3 pr-3 transition-colors ${active ? 'pl-[10px]' : 'pl-3'} ${selected ? 'bg-primary/10 hover:bg-primary/15' : active ? 'bg-primary/5' : 'hover:bg-muted/40'} ${active ? 'border-l-2 border-l-primary' : ''}`}
      data-selected={selectable ? selected : undefined}
    >
      <div className="flex min-w-0 items-start gap-3">
        {selectable ? (
          <label
            className="grid size-9 shrink-0 cursor-pointer place-items-center"
            htmlFor={checkboxId}
          >
            <Checkbox
              aria-label={label}
              checked={selected}
              className={`col-start-1 row-start-1 size-[18px] rounded-[5px] transition-opacity focus-visible:ring-2 focus-visible:ring-offset-2 ${selected ? 'opacity-100' : 'opacity-0 group-hover/row:opacity-100 group-has-[:focus-visible]/row:opacity-100 group-data-[selecting=true]/list:opacity-100'}`}
              id={checkboxId}
              onCheckedChange={(checked) => onSelectedChange(checked)}
            />
            {avatar(true)}
          </label>
        ) : !onSelect ? (
          avatar(false)
        ) : null}
        {onSelect ? (
          <button
            type="button"
            aria-current={active ? 'true' : undefined}
            className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 text-left focus-visible:outline-2 focus-visible:outline-ring"
            onClick={() => onSelect(message.id)}
          >
            {!selectable ? avatar(false) : null}
            <MessageText message={message} />
          </button>
        ) : (
          <MessageText message={message} />
        )}
      </div>
    </li>
  )
}
