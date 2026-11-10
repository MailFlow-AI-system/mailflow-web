import { readWorkspaceResponse } from '#/features/workspaces/clients/workspaceAuthority'
import { draftPageSchema } from '../email-composer/clients/drafts'

export async function fetchDraftPage(
  userId: string,
  workspaceId: string,
  offset: number,
  signal: AbortSignal,
  search = '',
) {
  const q = search.trim()
  return draftPageSchema.parse(
    await readWorkspaceResponse(
      `/api/mail/drafts?offset=${offset}${q ? `&q=${encodeURIComponent(q)}` : ''}`,
      userId,
      signal,
      { headers: { 'X-Workspace-Id': workspaceId } },
      workspaceId,
    ),
  )
}
