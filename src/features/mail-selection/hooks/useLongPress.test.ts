import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useLongPress } from './useLongPress'

describe('useLongPress', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('fires once after the delay while the pointer stays down', () => {
    const onLongPress = vi.fn()
    const { result } = renderHook(() => useLongPress(onLongPress, 500))

    act(() => result.current.onPointerDown())
    act(() => vi.advanceTimersByTime(499))
    expect(onLongPress).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(1))
    expect(onLongPress).toHaveBeenCalledTimes(1)
    act(() => vi.advanceTimersByTime(2000))
    expect(onLongPress).toHaveBeenCalledTimes(1)
  })

  it.each(['onPointerUp', 'onPointerLeave', 'onPointerCancel'] as const)(
    'does not fire when %s ends the press early',
    (end) => {
      const onLongPress = vi.fn()
      const { result } = renderHook(() => useLongPress(onLongPress, 500))

      act(() => result.current.onPointerDown())
      act(() => vi.advanceTimersByTime(300))
      act(() => result.current[end]())
      act(() => vi.advanceTimersByTime(1000))

      expect(onLongPress).not.toHaveBeenCalled()
    },
  )

  it('restarts the delay on a new press and cancels when unmounted', () => {
    const onLongPress = vi.fn()
    const { result, unmount } = renderHook(() => useLongPress(onLongPress, 500))

    act(() => result.current.onPointerDown())
    act(() => vi.advanceTimersByTime(400))
    act(() => result.current.onPointerDown())
    act(() => vi.advanceTimersByTime(400))
    expect(onLongPress).not.toHaveBeenCalled()

    unmount()
    act(() => vi.advanceTimersByTime(1000))
    expect(onLongPress).not.toHaveBeenCalled()
  })

  it('calls the latest callback', () => {
    const first = vi.fn()
    const second = vi.fn()
    const { result, rerender } = renderHook(({ cb }) => useLongPress(cb, 500), {
      initialProps: { cb: first },
    })

    act(() => result.current.onPointerDown())
    rerender({ cb: second })
    act(() => vi.advanceTimersByTime(500))

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })
})
