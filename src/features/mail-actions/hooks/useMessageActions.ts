import { toast } from '@mailflow/ui/components'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import {
  mailMessagesPageScopeKey,
  mailMessagesScopeKey,
} from '#/features/mail-list/queries/mailMessagesQuery'
import { postMessageAction } from '../clients/messageActionsClient'
import { inverseMessageAction, type MessageAction } from '../messageActions'
import { type MessageCacheScope, patchMessageCaches } from '../messageCache'

type RunOptions = { undoable?: boolean }
type Variables = { ids: readonly string[]; action: MessageAction; undoable: boolean }

const noun = (count: number) => (count === 1 ? 'Message' : `${count} messages`)

// Moves confirm with a toast and Undo; state toggles are already visible on the row.
const successText: Partial<Record<MessageAction, (count: number) => string>> = {
  archive: (count) => `${noun(count)} archived.`,
  unarchive: (count) => `${noun(count)} moved to Inbox.`,
  trash: (count) => `${noun(count)} moved to Trash.`,
  restore: (count) => `${noun(count)} restored.`,
  spam: (count) => `${noun(count)} marked as spam.`,
  not_spam: (count) => `${noun(count)} moved to Inbox.`,
  delete_permanently: (count) => `${noun(count)} deleted permanently.`,
}

const failureText: Record<MessageAction, string> = {
  read: 'Messages could not be marked as read. Try again.',
  unread: 'Messages could not be marked as unread. Try again.',
  star: 'Messages could not be starred. Try again.',
  unstar: 'Messages could not be unstarred. Try again.',
  archive: 'Messages could not be archived. Try again.',
  unarchive: 'Messages could not be moved to Inbox. Try again.',
  trash: 'Messages could not be moved to Trash. Try again.',
  restore: 'Messages could not be restored. Try again.',
  spam: 'Messages could not be marked as spam. Try again.',
  not_spam: 'Messages could not be moved to Inbox. Try again.',
  delete_permanently: 'Messages could not be deleted. Try again.',
}

/** Runs message actions with an optimistic update of every cached list and open message. */
export function useMessageActions(scope: MessageCacheScope) {
  const queryClient = useQueryClient()
  const { userId, workspaceSlug } = scope
  const mutation = useMutation({
    mutationFn: ({ ids, action }: Variables) => postMessageAction(userId, ids, action),
    onMutate: async ({ ids, action }) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: mailMessagesScopeKey(userId, workspaceSlug) }),
        queryClient.cancelQueries({ queryKey: mailMessagesPageScopeKey(userId, workspaceSlug) }),
      ])
      return {
        rollback: patchMessageCaches(
          queryClient,
          { userId, workspaceSlug },
          ids,
          action,
          new Date().toISOString(),
        ),
      }
    },
    onError: (_error, { action }, context) => {
      context?.rollback()
      toast.error(failureText[action])
    },
    onSuccess: (results, { ids, action, undoable }) => {
      const failed = results.filter((result) => result.status !== 'ok').length
      if (failed > 0) {
        toast.warning(`${failed} ${failed === 1 ? 'message' : 'messages'} could not be updated.`)
        return
      }
      const text = successText[action]?.(ids.length)
      const inverse = inverseMessageAction(action)
      if (!text) return
      toast.success(
        text,
        undoable && inverse
          ? {
              action: {
                label: 'Undo',
                onClick: () => mutation.mutate({ ids, action: inverse, undoable: false }),
              },
            }
          : undefined,
      )
    },
    onSettled: async () => {
      const lists = mailMessagesScopeKey(userId, workspaceSlug)
      const pages = mailMessagesPageScopeKey(userId, workspaceSlug)
      // The optimistic patch refreshed each page's timestamp, so pages must be stale before the
      // lists refetch through them. Other folders reload from Core when they are opened again.
      queryClient.removeQueries({ queryKey: lists, type: 'inactive' })
      queryClient.removeQueries({ queryKey: pages, type: 'inactive' })
      await queryClient.invalidateQueries({ queryKey: pages, refetchType: 'none' })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: lists }),
        queryClient.invalidateQueries({ queryKey: ['mail-unread-counts', userId, workspaceSlug] }),
      ])
    },
  })
  const { mutate } = mutation
  const run = useCallback(
    (ids: readonly string[], action: MessageAction, { undoable = true }: RunOptions = {}) => {
      if (ids.length > 0) mutate({ ids, action, undoable })
    },
    [mutate],
  )
  return { run, isPending: mutation.isPending }
}
