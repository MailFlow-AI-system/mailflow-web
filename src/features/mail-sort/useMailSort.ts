import { useQueryState } from 'nuqs'
import { useCallback, useEffect, useSyncExternalStore } from 'react'

import { defaultMailSort, type MailSortValue, mailSortParser, parseMailSort } from './mailSort'

export const mailSortStorageKey = (userId: string) => `mailflow:mail-sort:${userId}`

// Same-tab subscribers; other tabs report changes through the `storage` event.
const listeners = new Set<() => void>()
// Choices that could not be persisted still apply until the page reloads.
const unsavedChoices = new Map<string, MailSortValue>()

function readStoredSort(userId: string): MailSortValue {
  const unsaved = unsavedChoices.get(userId)
  if (unsaved) return unsaved
  try {
    return parseMailSort(window.localStorage.getItem(mailSortStorageKey(userId)))
  } catch {
    return defaultMailSort
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  window.addEventListener('storage', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', listener)
  }
}

function writeStoredSort(userId: string, sort: MailSortValue) {
  try {
    window.localStorage.setItem(mailSortStorageKey(userId), sort)
    unsavedChoices.delete(userId)
  } catch {
    unsavedChoices.set(userId, sort)
  }
  for (const listener of listeners) listener()
}

const urlOptions = { history: 'replace', scroll: false } as const

/**
 * The list order. `?sort=` is the source of truth; without it the user's last choice, kept in
 * this browser, applies. Choosing an order updates both, and `newest` leaves the URL clean.
 * The server and hydration render without the stored choice and report `isReady: false` so
 * lists can wait for it instead of fetching a page they would discard. `syncUrl` (one caller
 * per page) writes the stored choice into a URL that has no sort.
 */
export function useMailSort(userId: string, { syncUrl = false }: { syncUrl?: boolean } = {}) {
  const [urlSort, setUrlSort] = useQueryState('sort', mailSortParser)
  const stored = useSyncExternalStore<MailSortValue | null>(
    subscribe,
    () => readStoredSort(userId),
    () => null,
  )
  const setSort = useCallback(
    (sort: MailSortValue) => {
      writeStoredSort(userId, sort)
      void setUrlSort(sort === defaultMailSort ? null : sort, urlOptions)
    },
    [userId, setUrlSort],
  )

  useEffect(() => {
    if (syncUrl && urlSort === null && stored !== null && stored !== defaultMailSort)
      void setUrlSort(stored, urlOptions)
  }, [syncUrl, urlSort, stored, setUrlSort])

  return {
    sort: urlSort ?? stored ?? defaultMailSort,
    setSort,
    isReady: urlSort !== null || stored !== null,
  }
}
