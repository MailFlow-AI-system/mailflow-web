import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import type { MailboxBadges } from '#/features/app-shell/types'
import { readWorkspaceResponse } from '#/features/workspaces/clients/workspaceAuthority'

const countsSchema = z.object({
  inbox: z.number().int().nonnegative(),
  spam: z.number().int().nonnegative(),
})

export const unreadCountsKey = (userId: string, workspaceSlug: string) =>
  ['mail-unread-counts', userId, workspaceSlug] as const

/** Unread badges for the Inbox and Spam links; message actions invalidate this query. */
export function useUnreadCounts(userId: string, workspaceSlug: string | undefined) {
  const query = useQuery({
    queryKey: unreadCountsKey(userId, workspaceSlug ?? ''),
    queryFn: async ({ signal }) =>
      countsSchema.parse(
        await readWorkspaceResponse('/api/mail/unread-counts', userId, signal, {
          headers: { Accept: 'application/json' },
        }),
      ),
    enabled: Boolean(workspaceSlug),
    staleTime: 30_000,
    retry: false,
  })
  if (!query.data) return undefined
  return { '/inbox': query.data.inbox, '/spam': query.data.spam } satisfies MailboxBadges
}
