import { workspaceSchema } from '../schemas'
import type { Workspace } from '../types'
import { resolveWorkspaceHost } from './workspaceHost'

const collectionPaths = new Set(['/inbox', '/sent', '/drafts', '/starred', '/spam', '/trash'])

export function workspaceDestination(current: string, baseHost: string, workspace: Workspace) {
  const url = new URL(current)
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    resolveWorkspaceHost(url.hostname, baseHost).kind === 'invalid'
  )
    throw new Error('Invalid workspace origin')
  const target = workspaceSchema.parse(workspace)
  url.hostname = `${target.slug}.${baseHost}`
  url.pathname = collectionPaths.has(url.pathname) ? url.pathname : '/inbox'
  url.search = ''
  url.hash = ''
  return url.href
}
