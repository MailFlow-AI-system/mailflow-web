import { Button } from '@mailflow/ui/components'
import { Clock, Save, Send } from '@mailflow/ui/icons'
import { useComposer } from '../context'
import { useDraftStatus } from '../hooks/useDraftStatus'

export function Footer() {
  const { saveDraft } = useComposer()
  const { dirty, saved } = useDraftStatus()
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-background px-4 py-3">
      <div className="flex items-center gap-2">
        <Button className="gap-2" aria-disabled="true" title="Envio ainda não disponível">
          <Send aria-hidden="true" className="size-4" />
          Send
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label="Agendar envio"
          aria-disabled="true"
          title="Agendamento ainda não disponível"
        >
          <Clock aria-hidden="true" className="size-4" />
        </Button>
        <Button
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
        {dirty ? 'Alterações não salvas' : saved ? 'Rascunho nesta aba' : 'Não enviado'}
      </span>
    </div>
  )
}
