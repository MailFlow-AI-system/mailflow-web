import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../clients/mailMessagesClient', () => ({ fetchMailMessages: vi.fn() }))

import { MailSelectionProvider } from '#/features/mail-selection/components/MailSelectionProvider'
import { useMailSelection } from '#/features/mail-selection/hooks/useMailSelection'
import { MailListView } from './MailList'

function SelectionControls({
  fetching,
  onAutoSelect,
}: {
  fetching: boolean
  onAutoSelect: (id: string) => void
}) {
  const selection = useMailSelection()
  return (
    <>
      <button type="button" onClick={() => selection?.enter()}>
        Enter selection
      </button>
      <button type="button" onClick={() => selection?.exit()}>
        Exit selection
      </button>
      <MailListView
        label="Inbox"
        mail={{ ...mail, isFetching: fetching }}
        onAutoSelect={onAutoSelect}
        selection={selection ?? undefined}
      />
    </>
  )
}

const message = (id: string) => ({ id, senderName: 'Ada', subject: id, body: '', receivedAt: '' })
const mail = {
  messages: [message('first'), message('second')],
  isPending: false,
  isFetching: false,
  isFetchingNextPage: false,
  isError: false,
  hasNextPage: false,
  hasNextPageError: false,
  fetchNextPage: async () => {},
  refetch: async () => {},
}

afterEach(cleanup)

describe('initial message selection', () => {
  it('selects the first settled result once and does not reopen it after back', async () => {
    const onAutoSelect = vi.fn()
    const view = render(
      <MailListView
        label="Inbox"
        mail={{ ...mail, isPending: true }}
        onAutoSelect={onAutoSelect}
      />,
    )
    expect(onAutoSelect).not.toHaveBeenCalled()
    view.rerender(<MailListView label="Inbox" mail={mail} onAutoSelect={onAutoSelect} />)
    await waitFor(() => expect(onAutoSelect).toHaveBeenCalledExactlyOnceWith('first'))
    view.rerender(
      <MailListView label="Inbox" mail={mail} selectedId="first" onAutoSelect={onAutoSelect} />,
    )
    view.rerender(<MailListView label="Inbox" mail={mail} onAutoSelect={onAutoSelect} />)
    expect(onAutoSelect).toHaveBeenCalledTimes(1)
  })

  it('does not automatically open a message after bulk selection starts during fetching', () => {
    const onAutoSelect = vi.fn()
    const view = render(
      <MailSelectionProvider>
        <SelectionControls fetching onAutoSelect={onAutoSelect} />
      </MailSelectionProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Enter selection' }))
    view.rerender(
      <MailSelectionProvider>
        <SelectionControls fetching={false} onAutoSelect={onAutoSelect} />
      </MailSelectionProvider>,
    )
    expect(onAutoSelect).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Exit selection' }))
    expect(onAutoSelect).not.toHaveBeenCalled()
  })

  it('preserves a deep link and does not reopen it after back', () => {
    const onAutoSelect = vi.fn()
    const view = render(
      <MailListView label="Sent" mail={mail} selectedId="second" onAutoSelect={onAutoSelect} />,
    )
    view.rerender(<MailListView label="Sent" mail={mail} onAutoSelect={onAutoSelect} />)
    expect(onAutoSelect).not.toHaveBeenCalled()
  })

  it('waits for search and errors to settle before selecting a result', async () => {
    const onAutoSelect = vi.fn()
    const view = render(
      <MailListView label="Inbox" mail={mail} isSearching onAutoSelect={onAutoSelect} />,
    )
    view.rerender(
      <MailListView label="Inbox" mail={{ ...mail, isError: true }} onAutoSelect={onAutoSelect} />,
    )
    expect(onAutoSelect).not.toHaveBeenCalled()
    view.rerender(
      <MailListView label="Inbox" mail={{ ...mail, messages: [] }} onAutoSelect={onAutoSelect} />,
    )
    expect(onAutoSelect).not.toHaveBeenCalled()
    view.rerender(<MailListView label="Inbox" mail={mail} onAutoSelect={onAutoSelect} />)
    await waitFor(() => expect(onAutoSelect).toHaveBeenCalledExactlyOnceWith('first'))
  })
})
