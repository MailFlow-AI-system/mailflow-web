import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { NuqsTestingAdapter, type UrlUpdateEvent } from 'nuqs/adapters/testing'
import type { ReactNode } from 'react'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { mailSortStorageKey, useMailSort } from './useMailSort'

function inUrl(searchParams = '', onUrlUpdate?: (event: UrlUpdateEvent) => void) {
  return ({ children }: { children: ReactNode }) => (
    <NuqsTestingAdapter searchParams={searchParams} onUrlUpdate={onUrlUpdate} hasMemory>
      {children}
    </NuqsTestingAdapter>
  )
}

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  vi.restoreAllMocks()
})

describe('useMailSort', () => {
  it('defaults to newest first when nothing is stored', () => {
    const { result } = renderHook(() => useMailSort('user-1'), { wrapper: inUrl() })
    expect(result.current.sort).toBe('newest')
    expect(result.current.isReady).toBe(true)
  })

  it('persists the choice per user and restores it after a reload', () => {
    const first = renderHook(() => useMailSort('user-1'), { wrapper: inUrl() })
    act(() => first.result.current.setSort('subject-asc'))
    expect(first.result.current.sort).toBe('subject-asc')
    expect(window.localStorage.getItem(mailSortStorageKey('user-1'))).toBe('subject-asc')
    first.unmount()

    const reloaded = renderHook(() => useMailSort('user-1'), { wrapper: inUrl() })
    expect(reloaded.result.current.sort).toBe('subject-asc')
  })

  it('keeps preferences isolated between users', () => {
    window.localStorage.setItem(mailSortStorageKey('user-1'), 'oldest')
    const other = renderHook(() => useMailSort('user-2'), { wrapper: inUrl() })
    expect(other.result.current.sort).toBe('newest')
    act(() => other.result.current.setSort('sender-desc'))
    expect(window.localStorage.getItem(mailSortStorageKey('user-1'))).toBe('oldest')
  })

  it('ignores an invalid stored value', () => {
    window.localStorage.setItem(mailSortStorageKey('user-1'), 'by-size')
    const { result } = renderHook(() => useMailSort('user-1'), { wrapper: inUrl() })
    expect(result.current.sort).toBe('newest')
  })

  it('keeps every consumer in the same tab in sync', () => {
    const header = renderHook(() => useMailSort('user-1'), { wrapper: inUrl() })
    const list = renderHook(() => useMailSort('user-1'), { wrapper: inUrl() })
    act(() => header.result.current.setSort('oldest'))
    expect(list.result.current.sort).toBe('oldest')
  })

  it('follows a change made in another tab', () => {
    const { result } = renderHook(() => useMailSort('user-1'), { wrapper: inUrl() })
    act(() => {
      window.localStorage.setItem(mailSortStorageKey('user-1'), 'sender-asc')
      window.dispatchEvent(
        new StorageEvent('storage', { key: mailSortStorageKey('user-1'), newValue: 'sender-asc' }),
      )
    })
    expect(result.current.sort).toBe('sender-asc')
  })

  it('falls back to newest when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    const { result } = renderHook(() => useMailSort('user-1'), { wrapper: inUrl() })
    expect(result.current.sort).toBe('newest')
    act(() => result.current.setSort('oldest'))
    // The choice still applies to the current page even when it cannot be persisted.
    expect(result.current.sort).toBe('oldest')
  })

  it('renders the default and reports not ready on the server', () => {
    window.localStorage.setItem(mailSortStorageKey('user-1'), 'oldest')
    function Probe() {
      const { sort, isReady } = useMailSort('user-1')
      return `${sort}:${isReady}`
    }
    const Wrapper = inUrl()
    expect(
      renderToString(
        <Wrapper>
          <Probe />
        </Wrapper>,
      ),
    ).toBe('newest:false')
  })

  it('prefers the sort in the URL over the stored preference', () => {
    window.localStorage.setItem(mailSortStorageKey('user-1'), 'oldest')
    const { result } = renderHook(() => useMailSort('user-1'), {
      wrapper: inUrl('?sort=subject-desc'),
    })
    expect(result.current.sort).toBe('subject-desc')
    expect(result.current.isReady).toBe(true)
  })

  it('ignores an invalid sort in the URL and uses the stored preference', () => {
    window.localStorage.setItem(mailSortStorageKey('user-1'), 'oldest')
    const { result } = renderHook(() => useMailSort('user-1'), { wrapper: inUrl('?sort=size') })
    expect(result.current.sort).toBe('oldest')
  })

  it('writes the choice to the URL and the storage, omitting the default', async () => {
    const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>()
    const { result } = renderHook(() => useMailSort('user-1'), {
      wrapper: inUrl('?q=invoice', onUrlUpdate),
    })
    act(() => result.current.setSort('sender-asc'))
    await waitFor(() =>
      expect(onUrlUpdate).toHaveBeenLastCalledWith(
        expect.objectContaining({ queryString: '?q=invoice&sort=sender-asc' }),
      ),
    )
    expect(onUrlUpdate.mock.lastCall?.[0].options.history).toBe('replace')
    expect(window.localStorage.getItem(mailSortStorageKey('user-1'))).toBe('sender-asc')

    act(() => result.current.setSort('newest'))
    await waitFor(() =>
      expect(onUrlUpdate).toHaveBeenLastCalledWith(
        expect.objectContaining({ queryString: '?q=invoice' }),
      ),
    )
    expect(result.current.sort).toBe('newest')
  })

  it('reflects a stored preference in a URL that has no sort', async () => {
    window.localStorage.setItem(mailSortStorageKey('user-1'), 'oldest')
    const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>()
    renderHook(() => useMailSort('user-1', { syncUrl: true }), {
      wrapper: inUrl('', onUrlUpdate),
    })
    await waitFor(() =>
      expect(onUrlUpdate).toHaveBeenLastCalledWith(
        expect.objectContaining({ queryString: '?sort=oldest' }),
      ),
    )
    expect(onUrlUpdate.mock.lastCall?.[0].options.history).toBe('replace')
  })

  it('does not overwrite a sort that is already in the URL', () => {
    window.localStorage.setItem(mailSortStorageKey('user-1'), 'oldest')
    const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>()
    renderHook(() => useMailSort('user-1', { syncUrl: true }), {
      wrapper: inUrl('?sort=subject-asc', onUrlUpdate),
    })
    expect(onUrlUpdate).not.toHaveBeenCalled()
  })
})
