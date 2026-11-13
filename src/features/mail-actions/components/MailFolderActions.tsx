import { type InfiniteData, useQueryClient } from '@tanstack/react-query'
import { parseAsString, useQueryState } from 'nuqs'
import { type ReactNode, useCallback, useEffect } from 'react'
import { mailMessagesKey } from '#/features/mail-list/queries/mailMessagesQuery'
import { isMailFolderName } from '#/features/mail-list/types/mailFolder'
import type { MailMessagesPage } from '#/features/mail-list/types/mailMessage'
import { mailQueryParser } from '#/features/mail-list/types/mailSearch'
import { useWorkspaceContext } from '#/features/workspaces/hooks/useWorkspaceContext'
import { patchMessageCaches } from '../messageCache'
import { neighborMessageId } from '../neighborMessage'
import { MailActionsProvider } from './MailActionsProvider'

/**
 * Provides message actions on workspace folder pages. Outside those pages, or before the
 * workspace is known, children render without actions.
 */
export function MailFolderActions({
  userId,
  pathname,
  children,
}: {
  userId: string
  pathname: string
  children: ReactNode
}) {
  const workspace = useWorkspaceContext()
  const folder = pathname.replace(/^\//, '').replace(/\/$/, '')
  const slug = workspace?.current?.slug
  const queryClient = useQueryClient()
  const [openId, setOpenId] = useQueryState(
    'message',
    parseAsString.withOptions({ shallow: false, history: 'replace', scroll: false }),
  )
  const [q] = useQueryState('q', mailQueryParser.withDefault(''))
  const valid = isMailFolderName(folder) && Boolean(slug)

  const onLeave = useCallback(
    (ids: readonly string[]) => {
      if (!openId || !ids.includes(openId) || !slug || !isMailFolderName(folder)) return
      const list = queryClient.getQueryData<InfiniteData<MailMessagesPage>>(
        mailMessagesKey(userId, slug, q.trim(), folder),
      )
      const listIds = list?.pages.flatMap((page) => page.items.map((item) => item.id)) ?? []
      void setOpenId(neighborMessageId(listIds, openId, ids))
    },
    [folder, openId, q, queryClient, setOpenId, slug, userId],
  )

  // Core marks a message read when its detail is fetched; reflect it in the lists at once.
  useEffect(() => {
    if (!openId || !slug || !valid) return
    patchMessageCaches(
      queryClient,
      { userId, workspaceSlug: slug },
      [openId],
      'read',
      new Date().toISOString(),
    )
  }, [openId, queryClient, slug, userId, valid])

  if (!valid || !slug || !isMailFolderName(folder)) return children
  return (
    <MailActionsProvider folder={folder} userId={userId} workspaceSlug={slug} onLeave={onLeave}>
      {children}
    </MailActionsProvider>
  )
}
