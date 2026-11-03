import { Badge } from '@mailflow/ui/components'
import type { MailLabel } from './mailLabel'

export function MailLabelBadges({
  labels,
  compact = false,
}: {
  labels?: MailLabel[]
  compact?: boolean
}) {
  if (!labels?.length) return null

  return (
    <span className={`flex min-w-0 flex-wrap items-center ${compact ? 'gap-1.5' : 'mt-2 gap-2'}`}>
      {labels.map(({ id, name, color }) => (
        <Badge
          key={id}
          variant="secondary"
          className={`max-w-full ${compact ? 'h-4 px-1.5 py-0 text-[9px] font-normal' : 'text-[10px]'}`}
        >
          <span
            aria-hidden="true"
            className="size-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="truncate" title={name}>
            {name}
          </span>
        </Badge>
      ))}
    </span>
  )
}
