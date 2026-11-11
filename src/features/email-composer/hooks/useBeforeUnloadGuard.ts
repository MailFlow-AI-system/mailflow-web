import { useEffect, useRef } from 'react'

/**
 * Asks the browser to confirm a refresh, tab close or external navigation while
 * `shouldWarn` reports work that would be lost. Browsers only show their own
 * generic prompt here, so the message cannot be customised.
 */
export function useBeforeUnloadGuard(shouldWarn: () => boolean) {
  const shouldWarnRef = useRef(shouldWarn)
  shouldWarnRef.current = shouldWarn

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!shouldWarnRef.current()) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])
}
