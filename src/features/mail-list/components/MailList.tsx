import { Button } from '@mailflow/ui/components'
import { type ReactNode, useCallback, useEffect, useId, useRef } from 'react'

import { MailSelectionBar } from '#/features/mail-selection/components/MailSelectionBar'
import { useCoarseLayout } from '#/features/mail-selection/hooks/useCoarseLayout'
import { useMailSelection } from '#/features/mail-selection/hooks/useMailSelection'
import type { MailSelection } from '#/features/mail-selection/types/selection'
import { useMailListAutoFill } from '../hooks/useMailListAutoFill'
import { useMailMessages } from '../hooks/useMailMessages'
import type { MailFolderName } from '../types/mailFolder'
import type { MailMessage } from '../types/mailMessage'
import { MailFolderEmpty } from './MailFolderEmpty'
import { MailMessageCard } from './MailMessageCard'
import { MailMessageSkeletonRows } from './MailMessageSkeleton'

type MailListProps = {
  workspaceSlug: string
  userId: string
  q: string
  folder?: MailFolderName
  isSearching?: boolean
  selectedId?: string
  onSelect?: (id: string) => void
  onAutoSelect?: (id: string) => void
  heading?: string
  // Folder actions supplied by the page, so the list stays independent of them.
  renderSelectionActions?: (messages: readonly MailMessage[]) => ReactNode
  renderActions?: (message: MailMessage) => ReactNode
}

export function MailList({
  userId,
  workspaceSlug,
  q,
  folder = 'inbox',
  isSearching = false,
  selectedId,
  onSelect,
  onAutoSelect,
  heading,
  renderSelectionActions,
  renderActions,
}: MailListProps) {
  const mail = useMailMessages(userId, workspaceSlug, q, folder)
  const selection = useMailSelection()
  return (
    <MailListView
      mail={mail}
      q={q}
      isSearching={isSearching}
      label={`${heading ?? 'Inbox'} message list`}
      selectedId={selectedId}
      onSelect={onSelect}
      onAutoSelect={onAutoSelect}
      selection={selection ?? undefined}
      selectionActions={renderSelectionActions?.(mail.messages)}
      renderActions={renderActions}
      empty={<MailFolderEmpty folder={folder} q={q} />}
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
  selectedId?: string
  onSelect?: (id: string) => void
  onAutoSelect?: (id: string) => void
  selection?: MailSelection | undefined
  // Mailbox-specific bulk actions shown in the selection bar.
  selectionActions?: ReactNode
  // Row controls beside each pointer-layout message.
  renderActions?: (message: MailMessage) => ReactNode
  // Replaces the generic text when the loaded list is empty.
  empty?: ReactNode
  heading?: string
}

export function MailListView({
  mail,
  label,
  q = '',
  isSearching = false,
  selectedId,
  onSelect,
  onAutoSelect,
  selection,
  selectionActions,
  renderActions,
  empty,
  heading,
}: MailListViewProps) {
  const listId = useId()
  const touch = useCoarseLayout()
  const initialSelectionHandled = useRef(false)
  useEffect(() => {
    if (initialSelectionHandled.current) return
    if (selectedId || selection?.selecting) {
      initialSelectionHandled.current = true
      return
    }
    const firstId = mail.messages[0]?.id
    if (
      onAutoSelect &&
      firstId &&
      !isSearching &&
      !mail.isPending &&
      !mail.isFetching &&
      !mail.isError
    ) {
      initialSelectionHandled.current = true
      onAutoSelect(firstId)
    }
  }, [
    selectedId,
    selection?.selecting,
    onAutoSelect,
    isSearching,
    mail.messages,
    mail.isPending,
    mail.isFetching,
    mail.isError,
  ])
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
          actions={selectionActions}
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
                  active={message.id === selectedId}
                  onSelect={onSelect}
                  selected={selection?.isSelected(message.id) ?? false}
                  actions={renderActions && !touch ? renderActions(message) : undefined}
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
          (empty ?? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              No messages found.
            </p>
          ))
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
