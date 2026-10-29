import { Avatar, AvatarFallback, Checkbox } from '@mailflow/ui/components'
import { useId } from 'react'
import { useLongPress } from '#/features/mail-selection/hooks/useLongPress'
import { getSenderAvatarColorClass } from '../senderAvatarColor'
import type { MailMessage } from '../types/mailMessage'

type MailMessageCardProps = {
  message: MailMessage
  selected?: boolean
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
  onSelectedChange,
  variant = 'pointer',
  selecting = false,
  onLongPress,
}: MailMessageCardProps) {
  const checkboxId = useId()
  const nameId = useId()
  const longPress = useLongPress(() => onLongPress?.())
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
        className={`border-b border-border ${selected ? 'bg-primary/10' : ''}`}
        data-selected={selected}
      >
        <label
          className="flex min-h-[88px] w-full min-w-0 cursor-pointer select-none items-start gap-2 py-4 pr-3 pl-1 active:bg-muted/40"
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
      <li className="border-b border-border" data-selected={false}>
        <div
          className="flex min-h-[88px] min-w-0 select-none items-start gap-3 px-4 py-4 [-webkit-touch-callout:none]"
          {...longPress}
        >
          {avatar(false)}
          <MessageText message={message} />
        </div>
      </li>
    )
  }

  return (
    <li
      className={`group/row border-b border-border px-3 py-3 transition-colors ${selected ? 'bg-primary/10 hover:bg-primary/15' : 'hover:bg-muted/40'}`}
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
        ) : (
          avatar(false)
        )}
        <MessageText message={message} />
      </div>
    </li>
  )
}
