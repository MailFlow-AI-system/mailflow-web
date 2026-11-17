import { outgoingListSearch } from '#/features/mail-list/clients/sentEmailsClient'
import type { MailSortValue } from '#/features/mail-sort/mailSort'
import { readWorkspaceResponse } from '#/features/workspaces/clients/workspaceAuthority'
import { draftPageSchema } from '../email-composer/clients/drafts'

export async function fetchDraftPage(
  userId: string,
  workspaceId: string,
  offset: number,
  signal: AbortSignal,
  search = '',
  sort: MailSortValue = 'newest',
) {
  return draftPageSchema.parse(
    await readWorkspaceResponse(
      `/api/mail/drafts?${outgoingListSearch(offset, search, sort)}`,
      userId,
      signal,
      { headers: { 'X-Workspace-Id': workspaceId } },
      workspaceId,
    ),
  )
}
