import { useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'

import { initializeBrowserObservability } from './faro'

export function BrowserObservability() {
  const router = useRouter()

  useEffect(() => {
    let active = true
    let cleanup: () => void = () => undefined

    void initializeBrowserObservability(router, import.meta.env).then((unsubscribe) => {
      if (!active) {
        unsubscribe?.()
        return
      }
      cleanup = unsubscribe ?? cleanup
    })

    return () => {
      active = false
      cleanup()
    }
  }, [router])

  return null
}
