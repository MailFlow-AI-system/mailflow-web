import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { WorkspaceIdentityChangedError } from '#/features/workspaces/clients/workspaceIdentityChangedError'
import { useWorkspaceContext } from '#/features/workspaces/hooks/useWorkspaceContext'
import { useWorkspaceIdentityRecovery } from '#/features/workspaces/hooks/useWorkspaceIdentityRecovery'
import { fetchSentEmails, readSentWorkspace } from '../clients/sentEmailsClient'

export function useSentEmails(userId: string) {
  const state = useWorkspaceContext()
  const hostname = typeof window === 'undefined' ? 'server' : window.location.hostname
  const foreignIdentity = Boolean(state && state.identityId !== userId)
  const useDefault = !state || state.status === 'unconfigured'
  const current = useQuery({
    queryKey: ['sent-workspace', userId, hostname],
    queryFn: ({ signal }) => readSentWorkspace(userId, signal),
    enabled: useDefault && !foreignIdentity,
    staleTime: 0,
    retry: false,
  })
  const workspace = foreignIdentity
    ? null
    : useDefault
      ? current.isFetching || current.isError
        ? null
        : current.data
      : state.status === 'ready'
        ? state.current
        : null
  const scopeLoading =
    !foreignIdentity &&
    (useDefault ? current.isPending || current.isFetching : state.status === 'loading')
  const contextFailed = foreignIdentity || (!scopeLoading && !workspace)
  const query = useInfiniteQuery({
    queryKey: ['sent-emails', userId, workspace?.id ?? null, hostname],
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) => {
      if (!workspace) throw new Error('Sent workspace could not be verified')
      return fetchSentEmails(userId, workspace.id, pageParam, signal)
    },
    enabled: Boolean(workspace),
    getNextPageParam: (page) => page.nextOffset ?? undefined,
    retry: false,
  })
  const identityError = foreignIdentity
    ? new WorkspaceIdentityChangedError()
    : ([current.error, query.error].find(
        (error) => error instanceof WorkspaceIdentityChangedError,
      ) ?? null)
  useWorkspaceIdentityRecovery(identityError)
  const seen = new Set<string>()
  const messages = (
    !workspace || identityError || (query.isError && !query.isFetchNextPageError)
      ? []
      : (query.data?.pages.flatMap((page) => page.items) ?? [])
  ).filter(({ id }) => {
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })
  return {
    ...query,
    messages,
    isPending: !contextFailed && (scopeLoading || query.isPending),
    isFetching: scopeLoading || query.isFetching,
    isError: contextFailed || query.isError,
    hasNextPage: Boolean(workspace && query.hasNextPage),
    hasNextPageError: Boolean(workspace && query.isFetchNextPageError),
    fetchNextPage: () =>
      workspace ? query.fetchNextPage({ cancelRefetch: false }) : Promise.resolve(),
    refetch: async () => {
      if (useDefault && !foreignIdentity) {
        const next = await current.refetch()
        if (next.isError || next.data?.id !== workspace?.id) return
      } else if (contextFailed) {
        state?.retry()
        return
      }
      return query.refetch({ cancelRefetch: false })
    },
  }
}
