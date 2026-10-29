import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useCoarseLayout } from './useCoarseLayout'

function stubMedia(matches: boolean) {
  const listeners = new Set<() => void>()
  const media = {
    matches,
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
  }
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => media),
  )
  return {
    set(next: boolean) {
      media.matches = next
      for (const listener of listeners) listener()
    },
  }
}

describe('useCoarseLayout', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('is false when matchMedia is unavailable', () => {
    vi.stubGlobal('matchMedia', undefined)
    expect(renderHook(() => useCoarseLayout()).result.current).toBe(false)
  })

  it('reads a touch or narrow layout and follows later changes', () => {
    const media = stubMedia(true)
    const { result } = renderHook(() => useCoarseLayout())
    expect(result.current).toBe(true)

    act(() => media.set(false))
    expect(result.current).toBe(false)
  })

  it('asks for coarse pointers and narrow windows', () => {
    stubMedia(false)
    renderHook(() => useCoarseLayout())

    expect(window.matchMedia).toHaveBeenCalledWith('(pointer: coarse), (max-width: 767.98px)')
  })
})
