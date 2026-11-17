import { MailListView } from '#/features/mail-list/components/MailList'
import { useMailSelection } from '#/features/mail-selection/hooks/useMailSelection'
import type { MailListOrder } from '#/features/mail-sort/mailSort'
import { DraftBulkActions } from './DraftBulkActions'
import { useDrafts } from './useDrafts'

export function DraftMailList({
  userId,
  q = '',
  order,
  isSearching = false,
  heading,
  onSelect,
}: {
  userId: string
  q?: string
  order?: MailListOrder
  isSearching?: boolean
  heading?: string
  onSelect?: (id: string) => void
}) {
  const mail = useDrafts(userId, q, order)
  const selection = useMailSelection()
  return (
    <MailListView
      label="Draft message list"
      q={q}
      sort={order?.sort}
      isSearching={isSearching}
      onSelect={onSelect}
      selection={selection ?? undefined}
      selectionActions={
        <DraftBulkActions userId={userId} workspace={mail.workspace} items={mail.items} />
      }
      {...(heading ? { heading } : {})}
      mail={mail}
    />
  )
}
