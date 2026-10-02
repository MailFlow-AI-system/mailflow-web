import { Header } from '#/features/app-shell/components/Header'

import { useMailboxSearch } from '../hooks/useMailboxSearch'

type MailboxSearchProps = {
  userId: string
}

export function MailboxSearch({ userId }: MailboxSearchProps) {
  const search = useMailboxSearch(userId)
  return <Header.Search onChange={search.onChange} value={search.value} />
}
