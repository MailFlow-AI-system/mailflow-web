import type { WorkspaceEntryBootstrap } from '../types/entry'
import { getWorkspaceEntryBootstrap } from './getWorkspaceEntryBootstrap'

export async function resolveWorkspaceEntry(
  pathname: string,
  baseHost: string | undefined,
  enabled: boolean,
): Promise<WorkspaceEntryBootstrap> {
  if (!baseHost || !enabled) return { kind: 'passthrough' }
  return getWorkspaceEntryBootstrap({ data: { pathname } })
}
