import { Button } from '@mailflow/ui/components'
import { Clock, Save, Send } from '@mailflow/ui/icons'
import { useFormContext, useFormState } from 'react-hook-form'
import { showFeatureUnavailable } from '#/lib/showFeatureUnavailable'
import { useComposer } from '../context'
import { useDraftStatus } from '../hooks/useDraftStatus'
import type { DraftValues } from '../types/DraftValues'
import { CompositionWarnings } from './CompositionWarnings'

export function Footer() {
  const { saveDraft, validation, sending, discarding, sendFailed, sendProgress } = useComposer()
  const { control } = useFormContext<DraftValues>()
  const { errors, isSubmitting } = useFormState({ control })
  const { dirty, saved } = useDraftStatus()
  const status = sending
    ? sendProgress || 'Enviando e-mail…'
    : sendFailed
      ? 'Falha no envio. Tente novamente.'
      : validation.ready
        ? 'Mensagem pronta'
        : dirty
          ? 'Alterações não salvas'
          : saved
            ? 'Rascunho nesta aba'
            : 'Não enviado'

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-background px-4 py-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Button
            type="button"
            className="gap-2"
            disabled={validation.ready || isSubmitting || sending}
            aria-busy={isSubmitting || sending}
            onClick={() => void validation.validate()}
          >
            <Send aria-hidden="true" className="size-4" />
            {discarding
              ? 'Aguarde…'
              : sending
                ? 'Enviando…'
                : sendFailed
                  ? 'Tentar novamente'
                  : validation.ready
                    ? 'Mensagem pronta'
                    : 'Enviar'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Agendar envio"
            onClick={showFeatureUnavailable}
            title="Agendamento ainda não disponível"
          >
            <Clock aria-hidden="true" className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={saveDraft}
            title="Manter o rascunho nesta aba"
          >
            <Save aria-hidden="true" className="size-4" />
            Rascunho
          </Button>
        </div>
        <span role="status" className="text-xs text-muted-foreground">
          {status}
        </span>
      </div>
      {errors.root?.server?.message ? (
        <p role="alert" className="px-4 pb-3 text-xs text-destructive">
          {errors.root.server.message}
        </p>
      ) : null}
      <CompositionWarnings />
    </>
  )
}
