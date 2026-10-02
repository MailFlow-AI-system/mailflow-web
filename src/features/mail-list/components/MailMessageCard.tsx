import type { MailMessage } from '../types/mailMessage'

type MailMessageCardProps = {
  message: MailMessage
}

function senderInitials(senderName: string) {
  const names = senderName.trim().split(/\s+/).filter(Boolean)
  return names
    .slice(0, 2)
    .map((name) => name[0]?.toUpperCase() ?? '')
    .join('')
}

export function MailMessageCard({ message }: MailMessageCardProps) {
  return (
    <li className="border-b border-border px-3 py-3 transition-colors hover:bg-muted/40">
      <div className="flex min-w-0 items-start gap-3">
        <div
          aria-hidden="true"
          className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-[11px] font-medium text-primary"
        >
          {senderInitials(message.senderName) || '?'}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="truncate text-xs font-medium">{message.senderName}</p>
          <p className="truncate text-xs font-medium">{message.subject}</p>
          <p className="truncate whitespace-nowrap text-[11px] text-muted-foreground">
            {message.body}
          </p>
        </div>
      </div>
    </li>
  )
}
