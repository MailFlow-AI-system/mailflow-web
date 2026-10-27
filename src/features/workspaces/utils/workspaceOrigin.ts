import { isRemoteWorkspaceBaseHost } from '../../../config/utils/workspaceBaseHost'
import { resolveWorkspaceHost } from './workspaceHost'

export function isWorkspaceRequestOrigin(url: URL, baseHost: string) {
  if (
    url.username ||
    url.password ||
    resolveWorkspaceHost(url.hostname, baseHost).kind === 'invalid'
  )
    return false
  if (baseHost === 'localhost') return url.protocol === 'http:'
  if (baseHost === 'workspace.test') return ['http:', 'https:'].includes(url.protocol)
  return isRemoteWorkspaceBaseHost(baseHost) && url.protocol === 'https:' && !url.port
}
