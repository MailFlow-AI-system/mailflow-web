import { Header } from '#/features/app-shell/components/Header'
import { useWorkspaceContext } from '#/features/workspaces/hooks/useWorkspaceContext'

import { useMailboxSearch } from '../hooks/useMailboxSearch'

type MailboxSearchProps = {
  userId: string
  // Warm the first page of each search in the background (Inbox only).
  prefetch?: boolean
}

export function MailboxSearch({ userId, prefetch = true }: MailboxSearchProps) {
  const workspace = useWorkspaceContext()
  const search = useMailboxSearch(userId, workspace?.current?.slug ?? '', prefetch)
  return <Header.Search onChange={search.onChange} value={search.value} />
}
