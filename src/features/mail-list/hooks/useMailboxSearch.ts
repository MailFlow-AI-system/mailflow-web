import { useQueryClient } from '@tanstack/react-query'
import { useQueryState } from 'nuqs'
import { useEffect, useRef, useState } from 'react'

import { mailMessagesPageOptions } from '../queries/mailMessagesQuery'
import { mailQueryParser } from '../types/mailSearch'

export function useMailboxSearch(userId: string) {
  const [query, setQuery] = useQueryState('q', mailQueryParser.withDefault(''))
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState({ query, value: query })
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  if (draft.query !== query) setDraft({ query, value: query })

  // biome-ignore lint/correctness/useExhaustiveDependencies: changing the URL query cancels a pending debounce.
  useEffect(
    () => () => {
      if (timer.current !== undefined) clearTimeout(timer.current)
    },
    [query],
  )

  function updateValue(nextValue: string) {
    setDraft({ query, value: nextValue })
    if (timer.current !== undefined) clearTimeout(timer.current)

    const normalized = nextValue.trim()
    if (normalized === query) {
      timer.current = undefined
      return
    }

    timer.current = setTimeout(() => {
      timer.current = undefined
      void queryClient.prefetchQuery(mailMessagesPageOptions(userId, normalized, null))
      void setQuery(normalized || null, { history: 'replace', scroll: false })
    }, 300)
  }

  return { value: draft.query === query ? draft.value : query, onChange: updateValue }
}
