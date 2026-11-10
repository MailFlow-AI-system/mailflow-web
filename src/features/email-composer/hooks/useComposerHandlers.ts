import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { sendEmail } from '../clients/sendEmail'

// Shared by every Composition host (the floating window and the inline draft editor).
export function useComposerHandlers(userId: string) {
  const queryClient = useQueryClient()
  const onSent = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['sent-workspace', userId] }),
      queryClient.invalidateQueries({ queryKey: ['sent-emails', userId] }),
      // A sent draft no longer exists, so every cached draft list is stale.
      queryClient.invalidateQueries({ queryKey: ['drafts', userId] }),
    ])
  }, [queryClient, userId])
  const onDraftChanged = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['drafts', userId] })
  }, [queryClient, userId])
  return { onSend: sendEmail, onSent, onDraftChanged }
}
