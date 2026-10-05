import type { ReactNode } from 'react'

export type Workspace = {
  id: string
  name: string
  slug: string
  role: 'owner' | 'admin' | 'member'
}
export type WorkspacePage = { items: Workspace[]; nextCursor: string | null }
export type WorkspaceState = {
  status: 'loading' | 'error' | 'empty' | 'ready' | 'unconfigured'
  current: Workspace | null
  items: Workspace[]
  retry: () => void
  loadMore: () => void
  hasMore: boolean
  loadingMore: boolean
  pageError: boolean
}
export type WorkspaceProviderProps = { userId: string; children: ReactNode }
export type WorkspaceBoundaryProps = { children: ReactNode }
export type WorkspaceSwitcherProps = {
  state: WorkspaceState
  onSelect?: (workspaceId: string | null) => void
  busy?: boolean
  selectionError?: string | null
}
export type WorkspaceHost =
  | { kind: 'generic' }
  | { kind: 'workspace'; slug: string }
  | { kind: 'invalid' }
