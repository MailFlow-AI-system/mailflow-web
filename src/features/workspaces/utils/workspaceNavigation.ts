import { safeMailCollectionPath } from '../../auth/utils/authNavigation'
import { workspaceSchema } from '../schemas'
import type { Workspace } from '../types'
import { isWorkspaceRequestOrigin } from './workspaceOrigin'

export function workspaceDestination(current: string, baseHost: string, workspace: Workspace) {
  const url = new URL(current)
  if (!isWorkspaceRequestOrigin(url, baseHost)) throw new Error('Invalid workspace origin')
  const target = workspaceSchema.parse(workspace)
  url.hostname = `${target.slug}.${baseHost}`
  url.pathname = safeMailCollectionPath(url.pathname)
  url.search = ''
  url.hash = ''
  return url.href
}
