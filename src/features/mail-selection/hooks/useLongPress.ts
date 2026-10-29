import { useCallback, useEffect, useRef } from 'react'

export function useLongPress(onLongPress: () => void, delay = 500) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const callback = useRef(onLongPress)
  callback.current = onLongPress

  const cancel = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = undefined
  }, [])
  const start = useCallback(() => {
    cancel()
    timer.current = setTimeout(() => {
      timer.current = undefined
      callback.current()
    }, delay)
  }, [cancel, delay])
  useEffect(() => cancel, [cancel])

  // A scroll or drag ends in pointercancel, so moving the finger never fires the press.
  return {
    onPointerDown: start,
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
  }
}
