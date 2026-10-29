import { Button } from '@mailflow/ui/components'
import { useCallback, useId, useRef } from 'react'

import { MailSelectionBar } from '#/features/mail-selection/components/MailSelectionBar'
import { useCoarseLayout } from '#/features/mail-selection/hooks/useCoarseLayout'
import { useMailSelection } from '#/features/mail-selection/hooks/useMailSelection'
import type { MailSelection } from '#/features/mail-selection/types/selection'
import { useMailListAutoFill } from '../hooks/useMailListAutoFill'
import { useMailMessages } from '../hooks/useMailMessages'
import type { MailMessage } from '../types/mailMessage'
import { MailMessageCard } from './MailMessageCard'
import { MailMessageSkeletonRows } from './MailMessageSkeleton'

type MailListProps = {
  workspaceSlug: string
  userId: string
  q: string
  isSearching?: boolean
  heading?: string
}

export function MailList({
  userId,
  workspaceSlug,
  q,
  isSearching = false,
  heading,
}: MailListProps) {
  const mail = useMailMessages(userId, workspaceSlug, q)
  const selection = useMailSelection()
  return (
    <MailListView
      mail={mail}
      q={q}
      isSearching={isSearching}
      label="Inbox message list"
      selection={selection ?? undefined}
      {...(heading ? { heading } : {})}
    />
  )
}

type MailListViewProps = {
  mail: {
    messages: MailMessage[]
    isPending: boolean
    isFetching: boolean
    isFetchingNextPage: boolean
    isError: boolean
    hasNextPage: boolean
    hasNextPageError: boolean
    fetchNextPage: () => Promise<unknown>
    refetch: () => Promise<unknown>
  }
  label: string
  q?: string
  isSearching?: boolean
  selection?: MailSelection | undefined
  heading?: string
}

export function MailListView({
  mail,
  label,
  q = '',
  isSearching = false,
  selection,
  heading,
}: MailListViewProps) {
  const listId = useId()
  const touch = useCoarseLayout()
  const scrollRootRef = useRef<HTMLElement>(null)
  const previousQuery = useRef(q)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const setScrollRoot = useCallback(
    (root: HTMLElement | null) => {
      scrollRootRef.current = root
      if (root && previousQuery.current !== q) {
        root.scrollTop = 0
        previousQuery.current = q
      }
    },
    [q],
  )
  const showSearchSkeletons = isSearching || mail.isPending
  const showPageSkeletons = !showSearchSkeletons && mail.isFetchingNextPage
  const isBusy = isSearching || mail.isFetching
  const showLoadError = !showSearchSkeletons && mail.isError && mail.messages.length === 0
  const hasSearchQuery = q.trim().length > 0
  function getStatusMessage() {
    if (showSearchSkeletons)
      return isSearching || hasSearchQuery ? 'Searching messages' : 'Loading messages'
    if (showLoadError) return ''
    if (mail.isFetchingNextPage) return 'Loading more messages'
    if (mail.isFetching) return ''
    if (mail.messages.length === 0) {
      return hasSearchQuery ? 'No messages found for this search' : 'No messages found.'
    }

    const count = mail.messages.length
    const searchContext = hasSearchQuery ? ' for this search' : ''
    return `${count} message${count === 1 ? '' : 's'} loaded${searchContext}`
  }
  const statusMessage = getStatusMessage()
  const advance = useMailListAutoFill({
    rootRef: scrollRootRef,
    sentinelRef,
    hasNextPage: !showSearchSkeletons && Boolean(mail.hasNextPage),
    isFetching: isBusy,
    hasNextPageError: mail.hasNextPageError,
    fetchNextPage: mail.fetchNextPage,
  })

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <p aria-atomic="true" aria-live="polite" className="sr-only" role="status">
        {statusMessage}
      </p>
      {selection ? (
        <MailSelectionBar
          controls={listId}
          disabled={showSearchSkeletons}
          heading={heading ?? label}
          hiddenReason={hasSearchQuery ? 'hidden by search' : 'not loaded'}
          selection={selection}
          touch={touch}
          visibleIds={mail.messages.map((message) => message.id)}
        />
      ) : heading ? (
        <h1 className="px-3 py-3 text-sm font-semibold">{heading}</h1>
      ) : null}
      <section
        aria-busy={isBusy}
        aria-label={label}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        id={listId}
        ref={setScrollRoot}
      >
        {showLoadError ? (
          <div className="grid justify-items-center gap-3 p-6 text-center">
            <p className="text-sm text-muted-foreground" role="alert">
              Messages could not be loaded.
            </p>
            <Button
              className="h-8 text-xs"
              onClick={() => void mail.refetch()}
              size="sm"
              type="button"
              variant="outline"
            >
              Retry loading messages
            </Button>
          </div>
        ) : showSearchSkeletons || mail.messages.length > 0 ? (
          <ul
            className="group/list m-0 list-none p-0"
            data-selecting={selection ? selection.selecting : undefined}
          >
            {showSearchSkeletons ? (
              <MailMessageSkeletonRows />
            ) : (
              mail.messages.map((message) => (
                <MailMessageCard
                  key={message.id}
                  message={message}
                  selected={selection?.isSelected(message.id) ?? false}
                  {...(selection
                    ? {
                        onSelectedChange: (selected: boolean) =>
                          selection.setSelected(message.id, selected),
                        onLongPress: () => selection.enterWith(message.id),
                        selecting: selection.selecting,
                        variant: touch ? ('touch' as const) : ('pointer' as const),
                      }
                    : {})}
                />
              ))
            )}
            {showPageSkeletons ? <MailMessageSkeletonRows /> : null}
          </ul>
        ) : (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">No messages found.</p>
        )}
        <div aria-hidden="true" className="h-px" ref={sentinelRef} />
        {!showSearchSkeletons && (mail.hasNextPage || mail.hasNextPageError) ? (
          <div className="grid place-items-center p-3">
            <Button
              className="h-8 text-xs"
              disabled={isBusy}
              onClick={() => advance(true)}
              size="sm"
              type="button"
              variant="outline"
            >
              {mail.isFetchingNextPage
                ? 'Loading messages'
                : mail.hasNextPageError
                  ? 'Retry loading messages'
                  : 'Load more messages'}
            </Button>
          </div>
        ) : null}
      </section>
    </div>
  )
}
