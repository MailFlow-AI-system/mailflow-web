import type { ReactNode } from 'react'

export type WorkspaceAccess = {
  kind: 'passthrough' | 'forbidden' | 'error' | 'invalid' | 'unauthenticated'
}
export type WorkspaceEntryBoundaryProps = {
  kind: WorkspaceAccess['kind']
  retry: () => void
  children: ReactNode
  accountAction?: ReactNode
}
