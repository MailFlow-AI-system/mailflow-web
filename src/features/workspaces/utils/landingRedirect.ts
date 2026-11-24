import { resolveWorkspaceHost } from './workspaceHost'

const loopbackAddresses = ['127.0.0.1', '[::1]']

// Workspaces exist only on `{slug}.{baseHost}`. Every other host served by this Worker (the
// bare base host, retired `app*` entry hosts and reserved names) goes to the landing page.
export function landingRedirect(url: URL, baseHost: string, siteUrl: string): string | null {
  if (loopbackAddresses.includes(url.hostname)) return null
  if (resolveWorkspaceHost(url.hostname, baseHost).kind === 'workspace') return null
  return `${new URL(siteUrl).origin}/`
}
