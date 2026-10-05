import type { LoginSearch, MailCollectionPath } from '../types/AuthNavigation'

const collections = new Set(['/inbox', '/sent', '/drafts', '/starred', '/spam', '/trash'])

export function safeMailCollectionPath(value: unknown): MailCollectionPath {
  return typeof value === 'string' && collections.has(value)
    ? (value as MailCollectionPath)
    : '/inbox'
}

export function normalizeLoginSearch(search: Record<string, unknown>): LoginSearch {
  const path = safeMailCollectionPath(search.returnTo)
  return path === '/inbox' ? {} : { returnTo: path }
}

export function workspaceLoginDestination(pathname: string) {
  const returnTo = safeMailCollectionPath(pathname)
  return `/login${returnTo === '/inbox' ? '' : `?${new URLSearchParams({ returnTo })}`}#`
}
