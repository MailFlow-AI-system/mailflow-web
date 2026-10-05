import type { ComposerNavigationGuard } from '#/features/email-composer'
import type { Workspace, WorkspaceState } from '../types'

export type BoundedJsonResult = { kind: 'ok'; body: unknown } | { kind: 'invalid' | 'too-large' }
export type WorkspaceSelectionOptions = {
  state: WorkspaceState
  baseHost: string | undefined
  enabled: boolean
  composer: ComposerNavigationGuard | null
}
export type WorkspaceSelectionConfirmationProps = {
  workspace: Workspace | null
  busy: boolean
  theme?: 'dark' | 'light'
  onCancel: () => void
  onConfirm: () => void
  error: string | null
}
