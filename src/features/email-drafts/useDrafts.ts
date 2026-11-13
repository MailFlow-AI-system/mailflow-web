import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { readSentWorkspace } from '#/features/mail-list/clients/sentEmailsClient'
import type { MailMessage } from '#/features/mail-list/types/mailMessage'
import { WorkspaceIdentityChangedError } from '#/features/workspaces/clients/workspaceIdentityChangedError'
import { useWorkspaceContext } from '#/features/workspaces/hooks/useWorkspaceContext'
import { useWorkspaceIdentityRecovery } from '#/features/workspaces/hooks/useWorkspaceIdentityRecovery'
import { fetchDraftPage } from './draftsClient'

export function useDrafts(userId: string, search = '') {
  const q = search.trim()
  const state = useWorkspaceContext()
  const hostname = typeof window === 'undefined' ? 'server' : window.location.hostname
  const foreignIdentity = Boolean(state && state.identityId !== userId)
  const useDefault = !state || state.status === 'unconfigured'
  const current = useQuery({
    queryKey: ['draft-workspace', userId, hostname],
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
    queryKey: ['drafts', userId, workspace?.id ?? null, hostname, q],
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) => {
      if (!workspace) throw new Error('Draft workspace could not be verified')
      return fetchDraftPage(userId, workspace.id, pageParam, signal, q)
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
  const items = (
    !workspace || identityError || (query.isError && !query.isFetchNextPageError)
      ? []
      : (query.data?.pages.flatMap((page) => page.items) ?? [])
  ).filter((item) => !seen.has(item.id) && Boolean(seen.add(item.id)))
  const messages: MailMessage[] = items.map((draft) => ({
    id: draft.id,
    senderName: draft.recipientName.trim() || draft.to || '(No recipient)',
    subject: draft.subject || '(No subject)',
    body: draft.text,
    receivedAt: draft.updatedAt,
  }))
  return {
    ...query,
    workspace,
    items,
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
