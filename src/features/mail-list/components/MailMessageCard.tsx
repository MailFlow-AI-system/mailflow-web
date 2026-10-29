import { Avatar, AvatarFallback } from '@mailflow/ui/components'
import { getSenderAvatarColorClass } from '../senderAvatarColor'
import type { MailMessage } from '../types/mailMessage'

type MailMessageCardProps = {
  message: MailMessage
  selected?: boolean
  onSelect?: (id: string) => void
}

function senderInitials(senderName: string) {
  const names = senderName.trim().split(/\s+/).filter(Boolean)
  return names
    .slice(0, 2)
    .map((name) => name[0]?.toUpperCase() ?? '')
    .join('')
}

export function MailMessageCard({ message, selected, onSelect }: MailMessageCardProps) {
  return (
    <li
      className={`border-b border-border transition-colors hover:bg-muted/40 ${selected ? 'border-l-2 border-l-primary bg-primary/5' : ''}`}
    >
      {onSelect ? (
        <button
          type="button"
          aria-current={selected ? 'true' : undefined}
          className={`block w-full cursor-pointer py-3 pr-3 text-left focus-visible:outline-2 focus-visible:outline-ring ${selected ? 'pl-[10px]' : 'pl-3'}`}
          onClick={() => onSelect(message.id)}
        >
          <CardContent message={message} />
        </button>
      ) : (
        <div className="px-3 py-3">
          <CardContent message={message} />
        </div>
      )}
    </li>
  )
}

function CardContent({ message }: { message: MailMessage }) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <Avatar aria-hidden="true" className="size-9">
        <AvatarFallback
          className={`text-[11px] font-medium ${getSenderAvatarColorClass(message.senderName, message.recipientEmail)}`}
        >
          {senderInitials(message.senderName) || '?'}
        </AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="truncate text-xs font-medium">{message.senderName}</p>
        <p className="truncate text-xs font-medium">{message.subject}</p>
        <p className="truncate whitespace-nowrap text-[11px] text-muted-foreground">
          {message.body}
        </p>
      </div>
    </div>
  )
}
