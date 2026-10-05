import type { ReactNode } from 'react'
import type { Workspace } from '../types'

export type WorkspaceEntry =
  | { source: 'preference' | 'fallback'; workspace: Workspace }
  | { source: 'none'; workspace: null }
export type WorkspaceEntryBootstrap =
  | { kind: 'passthrough' }
  | { kind: 'redirect'; href: string }
  | { kind: 'empty' | 'error' | 'invalid' | 'unauthenticated' }
export type WorkspaceEntryBoundaryProps = {
  kind: WorkspaceEntryBootstrap['kind']
  retry: () => void
  children: ReactNode
  accountAction?: ReactNode
}
