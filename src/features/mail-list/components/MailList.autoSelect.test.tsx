import { cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../clients/mailMessagesClient', () => ({ fetchMailMessages: vi.fn() }))

import { MailListView } from './MailList'

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
