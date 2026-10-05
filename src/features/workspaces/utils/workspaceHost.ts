import type { WorkspaceHost } from '../types'

export function resolveWorkspaceHost(hostname: string, baseHost: string): WorkspaceHost {
  if (hostname === baseHost) return { kind: 'generic' }
  if (!hostname.endsWith(`.${baseHost}`)) return { kind: 'invalid' }
  const slug = hostname.slice(0, -(baseHost.length + 1))
  if (slug.length > 63 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return { kind: 'invalid' }
  return { kind: 'workspace', slug }
}

export function workspaceInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}
