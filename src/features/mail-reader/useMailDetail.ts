import { useQuery } from '@tanstack/react-query'
import { readSentWorkspace } from '#/features/mail-list/clients/sentEmailsClient'
import {
  readWorkspaceResponse,
  WorkspaceIdentityChangedError,
} from '#/features/workspaces/clients/workspaceAuthority'
import { useWorkspaceContext } from '#/features/workspaces/hooks/useWorkspaceContext'
import { useWorkspaceIdentityRecovery } from '#/features/workspaces/hooks/useWorkspaceIdentityRecovery'
import { type MailFolder, mailDetailSchema } from './mailDetail'

export function useMailDetail(userId: string, folder: MailFolder, id: string) {
  const context = useWorkspaceContext()
  const hostname = typeof window === 'undefined' ? 'server' : window.location.hostname
  const foreignIdentity = Boolean(context && context.identityId !== userId)
  const fallback = !context || context.status === 'unconfigured'
  const scope = useQuery({
    queryKey: ['sent-workspace', userId, hostname],
    queryFn: ({ signal }) => readSentWorkspace(userId, signal),
    enabled: fallback && !foreignIdentity,
    staleTime: 0,
    retry: false,
  })
  const workspace = foreignIdentity
    ? null
    : fallback
      ? scope.isFetching || scope.isError
        ? null
        : scope.data
      : context.status === 'ready'
        ? context.current
        : null
  const query = useQuery({
    queryKey: ['mail-detail', userId, workspace?.id ?? null, hostname, folder, id],
    queryFn: async ({ signal }) => {
      if (!workspace) throw new Error('Workspace could not be verified')
      return mailDetailSchema.parse(
        await readWorkspaceResponse(
          `/api/mail/${folder}/${encodeURIComponent(id)}`,
          userId,
          signal,
          { headers: { Accept: 'application/json', 'X-Workspace-Id': workspace.id } },
          workspace.id,
        ),
      )
    },
    enabled: Boolean(workspace),
    retry: false,
  })
  const identityError = foreignIdentity
    ? new WorkspaceIdentityChangedError()
    : ([query.error, scope.error].find((error) => error instanceof WorkspaceIdentityChangedError) ??
      null)
  useWorkspaceIdentityRecovery(identityError)
  const contextError =
    foreignIdentity ||
    (fallback ? scope.isError : context.status === 'error' || context.status === 'empty')
  return {
    ...query,
    data: workspace && !identityError && !query.isError ? query.data : undefined,
    isError: query.isError || contextError,
  }
}
