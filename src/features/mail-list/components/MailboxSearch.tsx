import { Header } from '#/features/app-shell/components/Header'
import { useWorkspaceContext } from '#/features/workspaces/hooks/useWorkspaceContext'

import { useMailboxSearch } from '../hooks/useMailboxSearch'

type MailboxSearchProps = {
  userId: string
}

export function MailboxSearch({ userId }: MailboxSearchProps) {
  const workspace = useWorkspaceContext()
  const search = useMailboxSearch(userId, workspace?.current?.slug ?? '')
  return <Header.Search onChange={search.onChange} value={search.value} />
}
