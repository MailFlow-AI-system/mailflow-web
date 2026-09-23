import type { QueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'

export type RouterContext = {
  queryClient: QueryClient
}

export type RootDocumentProps = {
  children: ReactNode
}
