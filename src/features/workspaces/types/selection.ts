import type { WorkspaceState } from '../types'

export type BoundedJsonResult = { kind: 'ok'; body: unknown } | { kind: 'invalid' | 'too-large' }
export type WorkspaceSelectionOptions = {
  state: WorkspaceState
  baseHost: string | undefined
  enabled: boolean
}
