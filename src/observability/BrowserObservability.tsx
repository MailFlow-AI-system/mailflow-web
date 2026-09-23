import { useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'

import { initializeBrowserObservability } from './faro'

export function BrowserObservability() {
  const router = useRouter()

  useEffect(() => initializeBrowserObservability(router, import.meta.env), [router])

  return null
}
