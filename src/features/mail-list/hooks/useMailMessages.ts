import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query'
import { WorkspaceIdentityChangedError } from '#/features/workspaces/clients/workspaceIdentityChangedError'
import { useWorkspaceIdentityRecovery } from '#/features/workspaces/hooks/useWorkspaceIdentityRecovery'

import {
  mailMessagesKey,
  mailMessagesPageKey,
  mailMessagesPageOptions,
} from '../queries/mailMessagesQuery'
import type { MailMessagesPage } from '../types/mailMessage'

export function useMailMessages(userId: string, workspaceSlug: string, q: string) {
  const normalizedQ = q.trim()
  const queryClient = useQueryClient()
  const queryKey = mailMessagesKey(userId, workspaceSlug, normalizedQ)
  const firstPageKey = mailMessagesPageKey(userId, workspaceSlug, normalizedQ, null)
  const firstPage = queryClient.getQueryData<MailMessagesPage>(firstPageKey)
  const query = useInfiniteQuery({
    queryKey,
    initialPageParam: null as string | null,
    initialData: firstPage ? { pages: [firstPage], pageParams: [null] } : undefined,
    initialDataUpdatedAt: queryClient.getQueryState(firstPageKey)?.dataUpdatedAt,
    staleTime: 30_000,
    queryFn: ({ pageParam, signal }) =>
      queryClient.fetchQuery(
        mailMessagesPageOptions(userId, workspaceSlug, normalizedQ, pageParam, signal),
      ),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    retry: 0,
  })
  const nextCursor = query.data?.pages.at(-1)?.nextCursor ?? null
  const warmPage = useQuery({
    ...mailMessagesPageOptions(userId, workspaceSlug, normalizedQ, nextCursor),
    enabled: nextCursor !== null,
  })

  const identityError =
    [query.error, warmPage.error].find((error) => error instanceof WorkspaceIdentityChangedError) ??
    null
  useWorkspaceIdentityRecovery(identityError)
  const seenIds = new Set<string>()
  const messages = (
    identityError ? [] : (query.data?.pages.flatMap((page) => page.items) ?? [])
  ).filter((message) => {
    if (seenIds.has(message.id)) return false
    seenIds.add(message.id)
    return true
  })

  return {
    ...query,
    messages,
    fetchNextPage: () => query.fetchNextPage({ cancelRefetch: false }),
    hasNextPageError: Boolean(nextCursor) && (query.isFetchNextPageError || warmPage.isError),
  }
}
