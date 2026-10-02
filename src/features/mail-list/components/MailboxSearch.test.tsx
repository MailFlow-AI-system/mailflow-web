import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useQueryState } from 'nuqs'
import { NuqsTestingAdapter } from 'nuqs/adapters/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const queryState = vi.hoisted(() => ({ queryClient: { prefetchQuery: vi.fn() } }))
let updateSearch: ((value: string | null) => Promise<unknown>) | undefined

vi.mock('@tanstack/react-query', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-query')>()),
  useQueryClient: () => queryState.queryClient,
}))
vi.mock('#/features/app-shell/components/Header', () => ({
  Header: {
    Search: ({ value, onChange }: { value?: string; onChange?: (value: string) => void }) => (
      <input
        aria-label="Search inbox"
        onChange={(event) => onChange?.(event.currentTarget.value)}
        type="search"
        value={value}
      />
    ),
  },
}))

import { mailQueryParser } from '../types/mailSearch'
import { MailboxSearch } from './MailboxSearch'

function SearchHistoryControl() {
  const [, setQuery] = useQueryState('q', mailQueryParser.withDefault(''))
  updateSearch = setQuery
  return null
}

function QueryProbe() {
  const [query] = useQueryState('q', mailQueryParser.withDefault(''))
  return <output data-testid="query-value">{query}</output>
}

describe('MailboxSearch', () => {
  beforeEach(() => {
    queryState.queryClient.prefetchQuery.mockReset()
    updateSearch = undefined
    vi.useFakeTimers()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('prefetches and writes the normalized query together after 300ms', async () => {
    render(
      <NuqsTestingAdapter searchParams="" hasMemory>
        <MailboxSearch userId="user-1" />
        <QueryProbe />
      </NuqsTestingAdapter>,
    )
    const input = screen.getByRole('searchbox')

    fireEvent.change(input, { target: { value: '  invoice  ' } })
    expect(screen.getByTestId('query-value')).toHaveTextContent('')
    expect(queryState.queryClient.prefetchQuery).not.toHaveBeenCalled()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(299)
    })
    expect(screen.getByTestId('query-value')).toHaveTextContent('')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(queryState.queryClient.prefetchQuery).toHaveBeenCalledTimes(1)
    expect(queryState.queryClient.prefetchQuery.mock.calls[0]?.[0].queryKey).toEqual([
      'mail-messages-page',
      'user-1',
      'invoice',
      null,
    ])
    expect(screen.getByTestId('query-value')).toHaveTextContent('invoice')
    expect(input).toHaveValue('invoice')
  })

  it('removes q when the input is cleared', async () => {
    render(
      <NuqsTestingAdapter searchParams="?q=existing" hasMemory>
        <MailboxSearch userId="user-1" />
        <QueryProbe />
      </NuqsTestingAdapter>,
    )
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300)
    })

    expect(screen.getByTestId('query-value')).toHaveTextContent('')
  })

  it('cancels the pending debounce on unmount', () => {
    const view = render(
      <NuqsTestingAdapter searchParams="" hasMemory>
        <MailboxSearch userId="user-1" />
      </NuqsTestingAdapter>,
    )
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'invoice' } })
    view.unmount()
    vi.advanceTimersByTime(300)

    expect(queryState.queryClient.prefetchQuery).not.toHaveBeenCalled()
  })

  it('cancels pending input on external URL changes and resets the draft when navigating back', async () => {
    render(
      <NuqsTestingAdapter searchParams="?q=invoice" hasMemory>
        <MailboxSearch userId="user-1" />
        <SearchHistoryControl />
        <QueryProbe />
      </NuqsTestingAdapter>,
    )
    const input = screen.getByRole('searchbox')

    fireEvent.change(input, { target: { value: 'local draft' } })
    act(() => {
      void updateSearch?.('history')
    })
    expect(input).toHaveValue('history')
    act(() => {
      void updateSearch?.('')
    })
    expect(input).toHaveValue('')
    expect(screen.getByTestId('query-value')).toHaveTextContent('')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300)
    })
    expect(queryState.queryClient.prefetchQuery).not.toHaveBeenCalled()
  })
})
