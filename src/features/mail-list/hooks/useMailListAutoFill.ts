import type { RefObject } from 'react'
import { useCallback, useEffect, useRef } from 'react'

type MailListAutoFillInput = {
  rootRef: RefObject<HTMLElement | null>
  sentinelRef: RefObject<HTMLElement | null>
  hasNextPage: boolean
  isFetching: boolean
  hasNextPageError: boolean
  fetchNextPage: () => Promise<unknown>
}

export function useMailListAutoFill({
  rootRef,
  sentinelRef,
  hasNextPage,
  isFetching,
  hasNextPageError,
  fetchNextPage,
}: MailListAutoFillInput) {
  const inFlight = useRef(false)
  const state = useRef({ hasNextPage, isFetching, hasNextPageError, fetchNextPage })
  state.current = { hasNextPage, isFetching, hasNextPageError, fetchNextPage }

  const advance = useCallback((retry = false) => {
    const current = state.current
    if (
      !current.hasNextPage ||
      current.isFetching ||
      (current.hasNextPageError && !retry) ||
      inFlight.current
    ) {
      return
    }

    inFlight.current = true
    void current.fetchNextPage().then(
      () => {
        inFlight.current = false
      },
      () => {
        inFlight.current = false
      },
    )
  }, [])

  useEffect(() => {
    const root = rootRef.current
    const sentinel = sentinelRef.current
    if (
      !root ||
      !sentinel ||
      !hasNextPage ||
      isFetching ||
      hasNextPageError ||
      typeof IntersectionObserver === 'undefined'
    ) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) advance()
      },
      { root },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [advance, hasNextPage, hasNextPageError, isFetching, rootRef, sentinelRef])

  return advance
}
