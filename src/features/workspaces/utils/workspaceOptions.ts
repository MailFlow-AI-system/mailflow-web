import type { Workspace } from '../types'

export function workspaceOptions(items: Workspace[], current: Workspace | null): Workspace[] {
  // Context is independently authorized even when its list page has not been loaded yet.
  const options = new Map(items.map((workspace) => [workspace.id, workspace]))
  if (current) options.set(current.id, current)
  return [...options.values()]
}
