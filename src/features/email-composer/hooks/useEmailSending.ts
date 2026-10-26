import { toast } from '@mailflow/ui/components'
import { useCallback, useRef } from 'react'
import { sendEmail } from '../clients/sendEmail'
import type { ValidatedComposition } from '../types/composer'

export function useEmailSending(onSent?: () => void) {
  const pending = useRef<{ signature: string; id: string } | null>(null)
  return useCallback(
    async (composition: ValidatedComposition) => {
      const signature = JSON.stringify({
        ...composition,
        attachments: composition.attachments.map(({ id, file }) => ({
          id,
          name: file.name,
          size: file.size,
          lastModified: file.lastModified,
        })),
      })
      if (pending.current?.signature !== signature)
        pending.current = { signature, id: crypto.randomUUID() }
      const notification = toast.loading('Enviando e-mail…')
      try {
        await sendEmail(composition, pending.current.id)
      } catch {
        const message =
          'Não foi possível confirmar o envio. Sua mensagem foi mantida. Tente novamente.'
        toast.error(message, { id: notification })
        throw new Error(message)
      }
      pending.current = null
      toast.success('E-mail enviado com sucesso.', { id: notification })
      onSent?.()
    },
    [onSent],
  )
}
