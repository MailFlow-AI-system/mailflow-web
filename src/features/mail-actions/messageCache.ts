import type { InfiniteData, QueryClient, QueryKey } from '@tanstack/react-query'
import {
  mailMessagesPageScopeKey,
  mailMessagesScopeKey,
} from '#/features/mail-list/queries/mailMessagesQuery'
import { isMailFolderName, type MailFolderName } from '#/features/mail-list/types/mailFolder'
import type { MailMessage, MailMessagesPage } from '#/features/mail-list/types/mailMessage'
import { applyMessageAction, isInMailFolder, type MessageAction } from './messageActions'

export type MessageCacheScope = { userId: string; workspaceSlug: string }

// List keys are [kind, userId, workspaceSlug, folder, q, cursor?].
const folderOf = (key: QueryKey): MailFolderName | null =>
  isMailFolderName(key[3]) ? key[3] : null

function patchItems(
  items: MailMessage[],
  folder: MailFolderName,
  ids: ReadonlySet<string>,
  action: MessageAction,
  at: string,
) {
  let changed = false
  const next: MailMessage[] = []
  for (const item of items) {
    if (!ids.has(item.id)) {
      next.push(item)
      continue
    }
    changed = true
    const updated = applyMessageAction(item, action, at)
    if (updated && isInMailFolder(updated, folder)) next.push(updated)
  }
  return changed ? next : items
}

/**
 * Applies an action to every cached list and open message of one user and workspace, as Core
 * will after it succeeds. Messages that leave a folder disappear from it; arrivals in another
 * folder appear after the follow-up refetch. Returns a function that restores the snapshot.
 */
export function patchMessageCaches(
  queryClient: QueryClient,
  { userId, workspaceSlug }: MessageCacheScope,
  messageIds: readonly string[],
  action: MessageAction,
  at: string,
) {
  const ids = new Set(messageIds)
  const snapshot: [QueryKey, unknown][] = []
  const remember = (key: QueryKey, data: unknown) => snapshot.push([key, data])

  for (const [key, data] of queryClient.getQueriesData<InfiniteData<MailMessagesPage>>({
    queryKey: mailMessagesScopeKey(userId, workspaceSlug),
  })) {
    const folder = folderOf(key)
    if (!data || !folder) continue
    let changed = false
    const pages = data.pages.map((page) => {
      const items = patchItems(page.items, folder, ids, action, at)
      if (items === page.items) return page
      changed = true
      return { ...page, items }
    })
    if (!changed) continue
    remember(key, data)
    queryClient.setQueryData(key, { ...data, pages })
  }

  for (const [key, data] of queryClient.getQueriesData<MailMessagesPage>({
    queryKey: mailMessagesPageScopeKey(userId, workspaceSlug),
  })) {
    const folder = folderOf(key)
    if (!data || !folder) continue
    const items = patchItems(data.items, folder, ids, action, at)
    if (items === data.items) continue
    remember(key, data)
    queryClient.setQueryData(key, { ...data, items })
  }

  // Detail keys are ['mail-detail', userId, workspaceId, hostname, folder, id].
  for (const [key, data] of queryClient.getQueriesData<MailMessage>({
    queryKey: ['mail-detail', userId],
  })) {
    if (!data || !ids.has(String(key[5]))) continue
    const updated = applyMessageAction(data, action, at)
    // A permanently deleted message keeps its detail until the reader closes it.
    if (!updated) continue
    remember(key, data)
    queryClient.setQueryData(key, updated)
  }

  return () => {
    for (const [key, data] of snapshot) queryClient.setQueryData(key, data)
  }
}
