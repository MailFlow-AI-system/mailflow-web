import { Button } from '@mailflow/ui/components'
import { useCallback, useRef } from 'react'

import { useMailListAutoFill } from '../hooks/useMailListAutoFill'
import { useMailMessages } from '../hooks/useMailMessages'
import { MailMessageCard } from './MailMessageCard'
import { MailMessageSkeletonRows } from './MailMessageSkeleton'

type MailListProps = {
  userId: string
  q: string
  isSearching?: boolean
}

export function MailList({ userId, q, isSearching = false }: MailListProps) {
  const mail = useMailMessages(userId, q)
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
      <section
        aria-busy={isBusy}
        aria-label="Inbox message list"
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        ref={setScrollRoot}
      >
        {showSearchSkeletons || showPageSkeletons ? (
          <p className="sr-only" role="status">
            {isSearching ? 'Searching messages' : 'Loading messages'}
          </p>
        ) : null}
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
          <ul className="m-0 list-none p-0">
            {showSearchSkeletons ? (
              <MailMessageSkeletonRows />
            ) : (
              mail.messages.map((message) => <MailMessageCard key={message.id} message={message} />)
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
