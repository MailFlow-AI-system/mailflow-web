import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { WorkspaceIdentityChangedError } from '../clients/workspaceAuthority'
import { readWorkspaceContext, readWorkspacePage } from '../clients/workspaceClient'
import type { WorkspaceState } from '../types'
import { workspaceOptions } from '../utils/workspaceOptions'
import { useWorkspaceIdentityRecovery } from './useWorkspaceIdentityRecovery'

export function useWorkspaceData(userId: string, configured: boolean): WorkspaceState {
  const hostname = typeof window === 'undefined' ? 'server' : window.location.hostname
  const scope = ['workspaces', userId, hostname]
  const current = useQuery({
    queryKey: [...scope, 'context'],
    queryFn: ({ signal }) => readWorkspaceContext(userId, signal),
    enabled: configured,
    staleTime: 0,
    retry: false,
  })
  const list = useInfiniteQuery({
    queryKey: [...scope, 'list'],
    queryFn: ({ pageParam, signal }) => readWorkspacePage(userId, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: configured,
    staleTime: 0,
    retry: false,
  })
  const identityError =
    [current.error, list.error].find((error) => error instanceof WorkspaceIdentityChangedError) ??
    null
  useWorkspaceIdentityRecovery(identityError)
  const authorizedCurrent =
    current.isError || identityError ? null : (current.data?.workspace ?? null)
  const items = workspaceOptions(
    current.isError || identityError ? [] : (list.data?.pages.flatMap((page) => page.items) ?? []),
    authorizedCurrent,
  )
  let status: WorkspaceState['status'] = 'ready'
  if (!configured) status = 'unconfigured'
  else if (identityError || current.isError || (list.isError && !list.data)) status = 'error'
  else if (current.isPending || list.isPending) status = 'loading'
  else if (items.length === 0) status = 'empty'
  return {
    identityId: userId,
    status,
    current: authorizedCurrent,
    items,
    retry: () => {
      void current.refetch()
      void list.refetch()
    },
    loadMore: () => {
      if (!list.isFetchingNextPage) void list.fetchNextPage()
    },
    hasMore: list.hasNextPage,
    loadingMore: list.isFetchingNextPage,
    pageError: list.isFetchNextPageError,
  }
}
