import type { WorkspaceAccess } from '../types/access'
import { getWorkspaceAccess } from './getWorkspaceAccess'

export async function resolveWorkspaceAccess(
  baseHost: string | undefined,
  enabled: boolean,
): Promise<WorkspaceAccess> {
  if (!baseHost || !enabled) return { kind: 'passthrough' }
  return getWorkspaceAccess()
}
