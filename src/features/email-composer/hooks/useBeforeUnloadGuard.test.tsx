import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useBeforeUnloadGuard } from './useBeforeUnloadGuard'

afterEach(cleanup)

function unload() {
  const event = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(event)
  return event
}

describe('useBeforeUnloadGuard', () => {
  it('asks the browser to confirm leaving while the guard reports unsaved work', () => {
    renderHook(() => useBeforeUnloadGuard(() => true))
    const event = unload()
    expect(event.defaultPrevented).toBe(true)
  })

  it('does not interfere with leaving when there is nothing to lose', () => {
    renderHook(() => useBeforeUnloadGuard(() => false))
    expect(unload().defaultPrevented).toBe(false)
  })

  it('reads the latest state at unload time instead of at render time', () => {
    let dirty = false
    renderHook(() => useBeforeUnloadGuard(() => dirty))
    expect(unload().defaultPrevented).toBe(false)
    dirty = true
    expect(unload().defaultPrevented).toBe(true)
  })

  it('stops guarding once the composer unmounts', () => {
    const view = renderHook(() => useBeforeUnloadGuard(() => true))
    view.unmount()
    expect(unload().defaultPrevented).toBe(false)
  })
})
